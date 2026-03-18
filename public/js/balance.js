document.addEventListener('DOMContentLoaded', async () => {
  const pad2 = n => String(n).padStart(2, '0');
  const today = new Date();
  const localDateStr = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`;

  // ── Auto-save pending data từ lần trước (trước khi reload) ──
  const PENDING_KEY = 'balance_pending';
  const pending = localStorage.getItem(PENDING_KEY);
  if (pending) {
    try {
      await fetch('/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pending
      });
    } catch (e) { console.error('auto-save error', e); }
    localStorage.removeItem(PENDING_KEY);
  }

  // ── Tab switching ──
  document.querySelectorAll('.balance-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.balance-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.balance-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
    });
  });

  // ── Denomination grid (cash type) ──
  function calcCashTotal(container) {
    let total = 0;
    container.querySelectorAll('.denom-qty').forEach(input => {
      total += Number(input.value || 0) * Number(input.dataset.value);
    });
    const el = container.querySelector('.cashTotalDisplay');
    if (el) el.textContent = total.toLocaleString('vi-VN') + ' ₫';
    return total;
  }

  if (typeof INIT_CASH_DENOMS !== 'undefined') {
    Object.entries(INIT_CASH_DENOMS).forEach(([val, qty]) => {
      const input = document.querySelector(`.denom-qty[data-value="${val}"]`);
      if (input) input.value = qty;
    });
    const cashContainer = document.querySelector('.balance-tab-content .denomination-grid');
    if (cashContainer) calcCashTotal(cashContainer.closest('.balance-tab-content'));
  }

  // ── Collect current form values ──
  function collectData() {
    let cash = 0, denoms = {};
    const sourceValues = {};

    // Cash denoms
    const cashTab = document.querySelector('.balance-tab-content');
    if (cashTab) {
      cashTab.querySelectorAll('.denom-qty').forEach(input => {
        const qty = Number(input.value) || 0;
        denoms[input.dataset.value] = qty;
        cash += qty * Number(input.dataset.value);
      });
    }
    // Number sources — map theo sourceId
    document.querySelectorAll('.source-input').forEach(inp => {
      sourceValues[inp.dataset.sourceId] = Number(inp.value) || 0;
    });

    // Tính bank = tổng tất cả number sources (dùng source đầu tiên là bank)
    const numberSources = (typeof SOURCES !== 'undefined') ? SOURCES.filter(s => s.type !== 'cash') : [];
    const bank   = numberSources[0] ? (sourceValues[numberSources[0].id] || 0) : 0;
    const shopee = numberSources[1] ? (sourceValues[numberSources[1].id] || 0) : 0;

    return { cashBalance: cash, bankBalance: bank, shopeeBalance: shopee, cashDenoms: denoms, date: localDateStr, sourceValues };
  }

  // ── Lưu vào localStorage khi có thay đổi ──
  function scheduleSave() {
    localStorage.setItem(PENDING_KEY, JSON.stringify(collectData()));
  }

  document.querySelectorAll('.denom-qty').forEach(input => {
    input.addEventListener('input', () => {
      calcCashTotal(input.closest('.balance-tab-content'));
      scheduleSave();
    });
  });

  // ── Number inputs (bank/shopee type) ──
  document.querySelectorAll('.source-display').forEach(display => {
    const sid = display.dataset.sourceId;
    const hidden = document.querySelector(`.source-input[data-source-id="${sid}"]`);
    display.addEventListener('input', () => {
      const raw = display.value.replace(/\D/g, '');
      if (hidden) hidden.value = raw;
      display.value = raw ? Number(raw).toLocaleString('vi-VN') : '';
      scheduleSave();
    });
  });

  // ── Set today date label ──
  const dateInput = document.getElementById('balanceDate');
  if (dateInput) dateInput.value = localDateStr;
  const todayLabel = document.getElementById('todayLabel');
  if (todayLabel) todayLabel.textContent = today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Load history ──
  async function loadHistory() {
    const res = await fetch('/balance/history');
    const data = await res.json();

    if (data.length) {
      const todayRecord = data.find(r => String(r.date).split('T')[0] === localDateStr);
      if (!todayRecord) {
        await fetch('/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashBalance:   INIT_CASH   || 0,
            bankBalance:   INIT_BANK   || 0,
            shopeeBalance: INIT_SHOPEE || 0,
            cashDenoms:    INIT_CASH_DENOMS || {},
            date: localDateStr
          })
        });
        const res2 = await fetch('/balance/history');
        renderHistory(await res2.json());
      } else {
        renderHistory(data);
      }

      // Fill form
      const initVals = {};
      if (typeof SOURCES !== 'undefined') {
        const numberSources = SOURCES.filter(s => s.type !== 'cash');
        if (numberSources[0]) initVals[numberSources[0].id] = INIT_BANK || 0;
        if (numberSources[1]) initVals[numberSources[1].id] = INIT_SHOPEE || 0;
      }
      document.querySelectorAll('.source-display').forEach(display => {
        const sid = display.dataset.sourceId;
        const hidden = document.querySelector(`.source-input[data-source-id="${sid}"]`);
        const val = initVals[sid] || 0;
        if (hidden) hidden.value = val;
        display.value = val ? Number(val).toLocaleString('vi-VN') : '';
      });
    } else {
      renderHistory([]);
    }
  }

  function renderHistory(data) {
    const tbody = document.querySelector('#historyTable tbody');
    const thead = document.querySelector('#historyTable thead tr');
    // Build dynamic columns từ SOURCES
    const numberSources = (typeof SOURCES !== 'undefined') ? SOURCES.filter(s => s.type !== 'cash') : [];
    const cashSource    = (typeof SOURCES !== 'undefined') ? SOURCES.find(s => s.type === 'cash') : null;

    // Render header
    let thHtml = '<th data-i18n="col_date">Ngày</th>';
    if (cashSource) thHtml += `<th>${cashSource.name}</th>`;
    numberSources.forEach(s => { thHtml += `<th>${s.name}</th>`; });
    thHtml += '<th>Lương</th><th data-i18n="col_total">Tổng</th>';
    thead.innerHTML = thHtml;

    if (!data.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${2 + (cashSource?1:0) + numberSources.length + 1}"><i class="fa-solid fa-inbox"></i><p data-i18n="no_data">Chưa có dữ liệu</p></td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(r => {
      const [fy, fm, fd] = String(r.date).split('T')[0].split('-');
      const dateStr = `${fd}/${fm}/${fy}`;
      const salaryCell = r.salary > 0
        ? `<span class="badge-checkin">${Number(r.salary).toLocaleString('vi-VN')} ₫</span>`
        : '<span style="color:#94a3b8">-</span>';
      let row = `<td>${dateStr}</td>`;
      if (cashSource) row += `<td>${Number(r.cashBalance).toLocaleString('vi-VN')} ₫</td>`;
      if (numberSources[0]) row += `<td>${Number(r.bankBalance).toLocaleString('vi-VN')} ₫</td>`;
      if (numberSources[1]) row += `<td>${r.shopeeBalance > 0 ? Number(r.shopeeBalance).toLocaleString('vi-VN') + ' ₫' : '-'}</td>`;
      row += `<td>${salaryCell}</td><td><strong>${Number(r.total).toLocaleString('vi-VN')} ₫</strong></td>`;
      return `<tr>${row}</tr>`;
    }).join('');
  }

  loadHistory();

  // ── Giữ nút Lưu hoạt động nếu muốn lưu ngay ──
  document.querySelectorAll('.source-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const data = collectData();
      await fetch('/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      localStorage.removeItem(PENDING_KEY);
      location.reload();
    });
  });
});
