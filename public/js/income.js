// income.js - plain ASCII only, no arrow functions, no template literals
(function () {
  var curYear, curMonth, selectedDate;

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function formatVND(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' \u20ab';
  }

  function dateStr(y, m, d) {
    return y + '-' + pad(m + 1) + '-' + pad(d);
  }

  function renderCalendar(year, month) {
    var label = document.getElementById('calMonthLabel');
    var container = document.getElementById('calDays');
    if (!label || !container) return;

    var monthNames = ['Thang 1','Thang 2','Thang 3','Thang 4','Thang 5','Thang 6',
                      'Thang 7','Thang 8','Thang 9','Thang 10','Thang 11','Thang 12'];
    label.textContent = monthNames[month] + ' ' + year;

    container.innerHTML = '';

    // First day of month (0=Sun)
    var firstDay = new Date(year, month, 1).getDay();
    // Total days in month
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'cal-day empty';
      container.appendChild(empty);
    }

    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      var ds = dateStr(year, month, d);
      cell.setAttribute('data-date', ds);

      if (ds === selectedDate) {
        cell.classList.add('selected');
      }

      // Today highlight
      var today = new Date();
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add('today');
      }

      cell.onclick = (function (cell, ds) {
        return function () {
          var prev = container.querySelector('.cal-day.selected');
          if (prev) prev.classList.remove('selected');
          cell.classList.add('selected');
          selectedDate = ds;
          document.getElementById('incomeDate').value = ds;
          var parts = ds.split('-');
          document.getElementById('todayLabel').textContent = parts[2] + '/' + parts[1] + '/' + parts[0];
        };
      })(cell, ds);

      container.appendChild(cell);
    }
  }

  function initCalendar() {
    var now = new Date();
    curYear  = now.getFullYear();
    curMonth = now.getMonth();

    var y = curYear, m = curMonth, d = now.getDate();
    selectedDate = dateStr(y, m, d);

    document.getElementById('incomeDate').value = selectedDate;
    document.getElementById('todayLabel').textContent = pad(d) + '/' + pad(m + 1) + '/' + y;

    renderCalendar(curYear, curMonth);

    document.getElementById('calPrev').onclick = function () {
      curMonth--;
      if (curMonth < 0) { curMonth = 11; curYear--; }
      renderCalendar(curYear, curMonth);
    };

    document.getElementById('calNext').onclick = function () {
      curMonth++;
      if (curMonth > 11) { curMonth = 0; curYear++; }
      renderCalendar(curYear, curMonth);
    };
  }

  function initIncomeInput() {
    var display = document.getElementById('incomeDisplay');
    var hidden  = document.getElementById('incomeInput');

    display.addEventListener('input', function () {
      var raw = display.value.replace(/\./g, '').replace(/[^0-9]/g, '');
      hidden.value = raw || '0';
      if (raw) {
        display.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
    });
  }

  function loadHistory() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/income/history', true);
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      var data = JSON.parse(xhr.responseText);
      var tbody = document.querySelector('#incomeHistoryTable tbody');
      if (!data || data.length === 0) return;
      tbody.innerHTML = '';
      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var d = new Date(r.date);
        var dateFormatted = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
        var tr = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.textContent = dateFormatted;
        var td2 = document.createElement('td');
        td2.textContent = formatVND(r.total);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
      }
    };
    xhr.send();
  }

  function initSave() {
    document.getElementById('incomeSave').onclick = function () {
      var income = document.getElementById('incomeInput').value;
      var date   = document.getElementById('incomeDate').value;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/income', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        if (xhr.status === 200) {
          loadHistory();
        }
      };
      xhr.send(JSON.stringify({ income: income, date: date }));
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCalendar();
    initIncomeInput();
    initSave();
    loadHistory();
  });
})();
