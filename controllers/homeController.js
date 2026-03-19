const { User, BalanceHistory, IncomeHistory, ExpenseHistory, Source, Category } = require('../db/proxy');
const { encrypt, decrypt } = require('../utils/crypto');

const homeController = {
  index: async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);
      const balances = user ? user.getBalances() : { balance: 0, cashBalance: 0, bankBalance: 0, cashDenoms: {}, income: 0, expense: 0 };

      // Auto-carry balance nếu chưa có record hôm nay
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const todayRecord = await BalanceHistory.findOne({ userId: req.session.userId, date: { $gte: todayStart, $lte: todayEnd } });
      if (!todayRecord) {
        const latest = await BalanceHistory.findOne({ userId: req.session.userId }).sort({ date: -1 });
        if (latest) {
          const ld = latest.getDecrypted();
          await BalanceHistory.create({
            userId:        req.session.userId,
            date:          todayStart,
            cashBalance:   encrypt(String(ld.cashBalance)),
            bankBalance:   encrypt(String(ld.bankBalance)),
            shopeeBalance: encrypt(String(ld.shopeeBalance || 0)),
            total:         encrypt(String(ld.total)),
            cashDenoms:    latest.cashDenoms || encrypt('{}'),
            salary:        encrypt('0')
          });
        }
      }

      // Tính trực tiếp từ DB đềEluôn chính xác
      const allExpenses = await ExpenseHistory.find({ userId: req.session.userId });
      const expense = allExpenses.reduce((sum, r) => sum + (Number(decrypt(r.total)) || 0), 0);

      const allIncome = await IncomeHistory.find({ userId: req.session.userId, checkedIn: true });
      const income = allIncome.reduce((sum, r) => sum + (Number(decrypt(r.total)) || 0), 0);

      res.render('index', {
        title:    'Quản lý tài chính',
        username: req.session.username || '',
        ...balances,
        expense,
        income
      });
    } catch (err) {
      console.error('Home error:', err);
      res.render('index', {
        title: 'Quản lý tài chính',
        username: req.session.username || '',
        balance: 0, cashBalance: 0, bankBalance: 0, cashDenoms: {}, income: 0, expense: 0
      });
    }
  },

  balancePage: async (req, res) => {
    const user = await User.findById(req.session.userId);
    const balances = user ? user.getBalances() : { cashBalance: 0, bankBalance: 0, shopeeBalance: 0, cashDenoms: {} };
    const sources = await Source.find({ userId: req.session.userId }).sort({ createdAt: 1 });

    // Auto-carry: nếu chưa có record hôm nay thì tạo từ record gần nhất
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayRecord = await BalanceHistory.findOne({ userId: req.session.userId, date: { $gte: todayStart, $lte: todayEnd } });
    if (!todayRecord) {
      const latest = await BalanceHistory.findOne({ userId: req.session.userId }).sort({ date: -1 });
      if (latest) {
        const ld = latest.getDecrypted();
        await BalanceHistory.create({
          userId:        req.session.userId,
          date:          todayStart,
          cashBalance:   encrypt(String(ld.cashBalance)),
          bankBalance:   encrypt(String(ld.bankBalance)),
          shopeeBalance: encrypt(String(ld.shopeeBalance || 0)),
          total:         encrypt(String(ld.total)),
          cashDenoms:    latest.cashDenoms || encrypt('{}'),
          salary:        encrypt('0')
        });
      }
    }

    res.render('balance', {
      title:    'Cập nhật sềEdư',
      username: req.session.username || '',
      sources,
      ...balances
    });
  },

  updateBalance: async (req, res) => {
    const { cashBalance, bankBalance, shopeeBalance, cashDenoms, date } = req.body;
    const cash   = Number(cashBalance);
    const bank   = Number(bankBalance);
    const shopee = Number(shopeeBalance) || 0;
    const total  = cash + bank + shopee;

    const user = await User.findById(req.session.userId);
    user.setBalances({ cashBalance: cash, bankBalance: bank, shopeeBalance: shopee, cashDenoms });
    await user.save();

    let recordDate;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      recordDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      recordDate = new Date();
      recordDate.setHours(0, 0, 0, 0);
    }

    await BalanceHistory.findOneAndUpdate(
      { userId: req.session.userId, date: { $gte: recordDate, $lte: new Date(recordDate.getTime() + 86399999) } },
      {
        $set: {
          cashBalance:   encrypt(String(cash)),
          bankBalance:   encrypt(String(bank)),
          shopeeBalance: encrypt(String(shopee)),
          total:         encrypt(String(total)),
          cashDenoms:    encrypt(JSON.stringify(cashDenoms || {}))
        },
        $setOnInsert: { date: recordDate }
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true });
  },

  historyPage: async (req, res) => {
    const records = await BalanceHistory.find({ userId: req.session.userId }).sort({ date: -1 });
    const incomeRecords = await IncomeHistory.find({ userId: req.session.userId, checkedIn: true });

    // Map income theo ngay
    const incomeMap = {};
    incomeRecords.forEach(r => {
      const key = new Date(r.date).toISOString().split('T')[0];
      incomeMap[key] = Number(decrypt(r.total)) || 0;
    });

    const history = records.map(r => {
      const decrypted = r.getDecrypted();
      const key = new Date(r.date).toISOString().split('T')[0];
      decrypted.salary = incomeMap[key] || 0;
      return decrypted;
    });
    res.json(history);
  },

  incomePage: async (req, res) => {
    const user = await User.findById(req.session.userId);
    const balances = user ? user.getBalances() : { income: 0 };
    res.render('income', {
      title:    'Tổng thu nhập',
      username: req.session.username || '',
      income:   balances.income
    });
  },

  updateIncome: async (req, res) => {
    try {
      const { income, bankAmount, date } = req.body;
      const val     = Number(income) || Number(bankAmount) || 0;
      const bankAmt = Number(bankAmount) || 0;

      let recordDate;
      if (date) {
        const [y, m, d] = date.split('-').map(Number);
        recordDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);
      }

      // ChềElưu nếu đã check in
      const existing = await IncomeHistory.findOne({ userId: req.session.userId, date: recordDate });
      if (!existing || !existing.checkedIn) {
        return res.status(403).json({ success: false, message: 'Chua check in ngay nay' });
      }

      await IncomeHistory.findOneAndUpdate(
        { userId: req.session.userId, date: recordDate },
        {
          total:      encrypt(String(val)),
          bankAmount: encrypt(String(bankAmt)),
          cashAmount: encrypt('0'),
          cashDenoms: encrypt('{}')
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Cập nhật tổng income trên User (chềEđềEhiển thềE
      const allIncomeRecords = await IncomeHistory.find({ userId: req.session.userId, checkedIn: true });
      const totalIncome = allIncomeRecords.reduce((sum, r) => sum + (Number(decrypt(r.total)) || 0), 0);
      await User.findByIdAndUpdate(req.session.userId, { income: encrypt(String(totalIncome)) });

      res.json({ success: true });
    } catch (err) {
      console.error('updateIncome error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

incomeHistoryPage: async (req, res) => {
    const records = await IncomeHistory.find({ userId: req.session.userId }).sort({ date: -1 });
    res.json(records.map(r => {
      const d = r.getDecrypted();
      d.bankAmount = r.bankAmount ? (Number(decrypt(r.bankAmount)) || 0) : 0;
      d.cashDenoms = r.cashDenoms ? JSON.parse(decrypt(r.cashDenoms)) : {};
      return d;
    }));
  },

  checkIn: async (req, res) => {
    const { date } = req.body;
    // Parse date string "YYYY-MM-DD" theo local time (tranh lech UTC)
    let recordDate;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      recordDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      recordDate = new Date();
      recordDate.setHours(0, 0, 0, 0);
    }

    // Chi cho check in ngay hom nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (recordDate.getTime() !== today.getTime()) {
      return res.status(403).json({ success: false, message: 'Chi co the check in ngay hom nay' });
    }

    const record = await IncomeHistory.findOneAndUpdate(
      { userId: req.session.userId, date: recordDate },
      { checkedIn: true },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, checkedIn: record.checkedIn });
  },

  unCheckIn: async (req, res) => {
    const { date } = req.body;
    let recordDate;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      recordDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      recordDate = new Date();
      recordDate.setHours(0, 0, 0, 0);
    }

    await IncomeHistory.findOneAndUpdate(
      { userId: req.session.userId, date: recordDate },
      { checkedIn: false, total: encrypt('0'), bankAmount: encrypt('0'), cashAmount: encrypt('0'), cashDenoms: encrypt('{}') },
      { upsert: true, returnDocument: 'after' }
    );

    // Cập nhật tổng income trên User
    const allRecords = await IncomeHistory.find({ userId: req.session.userId, checkedIn: true });
    const totalIncome = allRecords.reduce((sum, r) => sum + (Number(decrypt(r.total)) || 0), 0);
    await User.findByIdAndUpdate(req.session.userId, { income: encrypt(String(totalIncome)) });

    res.json({ success: true });
  },

  expensePage: async (req, res) => {
    const user = await User.findById(req.session.userId);
    const expense = user ? (Number(decrypt(user.expense)) || 0) : 0;
    res.render('expense', {
      title: 'Chi tiêu',
      username: req.session.username || '',
      expense
    });
  },

  addExpense: async (req, res) => {
    try {
      const { amount, note, date, source } = req.body;
      const val = Number(amount);
      let recordDate;
      if (date) {
        const [y, m, d] = date.split('-').map(Number);
        recordDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        recordDate = new Date();
        recordDate.setHours(0, 0, 0, 0);
      }

      // Luu vao ExpenseHistory
      await ExpenseHistory.create({
        userId: req.session.userId,
        date:   recordDate,
        total:  encrypt(String(val)),
        note:   note || '',
        source: source || ''
      });

      // Cong tong chi tieu
      const allExpenses = await ExpenseHistory.find({ userId: req.session.userId });
      const totalExpense = allExpenses.reduce((sum, r) => sum + (Number(decrypt(r.total)) || 0), 0);
      await User.findByIdAndUpdate(req.session.userId, { expense: encrypt(String(totalExpense)) });

      // Tru khoi so du theo nguon
      const user = await User.findById(req.session.userId);
      const balances = user.getBalances();
      let newBank = balances.bankBalance;
      let newCash = balances.cashBalance;

      // Tìm source đềEbiết type
      const sourceDoc = await Source.findOne({ _id: source, userId: req.session.userId });
      const sourceType = sourceDoc ? sourceDoc.type : 'number';
      const isCash = sourceType === 'cash';

      if (isCash) {
        newCash = Math.max(0, newCash - val);
      } else {
        newBank = Math.max(0, newBank - val);
      }
      user.setBalances({ cashBalance: newCash, bankBalance: newBank, shopeeBalance: balances.shopeeBalance, cashDenoms: balances.cashDenoms });
      await user.save();

      // Ghi BalanceHistory
      await BalanceHistory.findOneAndUpdate(
        { userId: req.session.userId, date: recordDate },
        {
          cashBalance:   encrypt(String(newCash)),
          bankBalance:   encrypt(String(newBank)),
          shopeeBalance: encrypt(String(balances.shopeeBalance)),
          total:         encrypt(String(newCash + newBank + balances.shopeeBalance)),
          cashDenoms:    encrypt(JSON.stringify(balances.cashDenoms || {}))
        },
        { upsert: true, returnDocument: 'after' }
      );

      res.json({ success: true });
    } catch (err) {
      console.error('addExpense error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  expenseHistoryPage: async (req, res) => {
    const records = await ExpenseHistory.find({ userId: req.session.userId }).sort({ date: -1 });
    res.json(records.map(r => r.getDecrypted()));
  },

  managePage: async (req, res) => {
    res.render('manage', { title: 'Quản lí', username: req.session.username || '' });
  },

  statsPage: async (req, res) => {
    res.render('stats', { title: 'Thống kê', username: req.session.username || '' });
  },

  sourcesPage: async (req, res) => {
    res.render('sources', { title: 'Nguồn tiền', username: req.session.username || '' });
  },

  sourcesList: async (req, res) => {
    const sources = await Source.find({ userId: req.session.userId }).sort({ createdAt: 1 });
    res.json(sources);
  },

  sourceAdd: async (req, res) => {
    const { name, icon, type } = req.body;
    await Source.create({ userId: req.session.userId, name, icon: icon || 'fa-wallet', type: type || 'number' });
    res.json({ success: true });
  },

  sourceUpdate: async (req, res) => {
    const { id, name, icon, type, disabled, currency } = req.body;
    await Source.findOneAndUpdate({ _id: id, userId: req.session.userId }, { name, icon, type: type || 'number', disabled: !!disabled, currency: currency || 'VND' });
    res.json({ success: true });
  },

  sourceDelete: async (req, res) => {
    await Source.findOneAndDelete({ _id: req.body.id, userId: req.session.userId });
    res.json({ success: true });
  },

  categoriesPage: async (req, res) => {
    res.render('categories', { title: 'Danh mục', username: req.session.username || '' });
  },

  categoriesList: async (req, res) => {
    const cats = await Category.find({ userId: req.session.userId }).sort({ createdAt: 1 });
    res.json(cats);
  },

  categoryAdd: async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false });
    await Category.create({ userId: req.session.userId, name });
    res.json({ success: true });
  },

  categoryUpdate: async (req, res) => {
    const { id, name } = req.body;
    await Category.findOneAndUpdate({ _id: id, userId: req.session.userId }, { name });
    res.json({ success: true });
  },

  categoryDelete: async (req, res) => {
    await Category.findOneAndDelete({ _id: req.body.id, userId: req.session.userId });
    res.json({ success: true });
  }
};

module.exports = homeController;
