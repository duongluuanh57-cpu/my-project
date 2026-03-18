/**
 * SQLite adapter — fallback khi không có MongoDB
 * Implement cùng interface với Mongoose models để controller không cần thay đổi
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/crypto');

const DB_PATH = path.join(__dirname, '..', 'data.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance TEXT,
      cashBalance TEXT,
      bankBalance TEXT,
      shopeeBalance TEXT,
      cashDenoms TEXT,
      income TEXT,
      expense TEXT,
      resetToken TEXT DEFAULT NULL,
      resetTokenExpiry TEXT DEFAULT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS balance_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      cashBalance TEXT,
      bankBalance TEXT,
      shopeeBalance TEXT,
      total TEXT,
      cashDenoms TEXT,
      salary TEXT,
      UNIQUE(userId, date)
    );
    CREATE TABLE IF NOT EXISTS income_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      total TEXT,
      bankAmount TEXT,
      cashAmount TEXT,
      cashDenoms TEXT,
      checkedIn INTEGER DEFAULT 0,
      UNIQUE(userId, date)
    );
    CREATE TABLE IF NOT EXISTS expense_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      total TEXT,
      note TEXT DEFAULT '',
      source TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'fa-wallet',
      type TEXT DEFAULT 'number',
      currency TEXT DEFAULT 'VND',
      disabled INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);
}

function newId() {
  return require('crypto').randomBytes(12).toString('hex');
}

function localDateStr(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const pad = n => n < 10 ? '0' + n : '' + n;
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}

// ─── USER ────────────────────────────────────────────────────────────────────

function makeUserDoc(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id:  row.id,
    username:     row.username,
    email:        row.email,
    password:     row.password,
    cashBalance:  row.cashBalance  || encrypt('0'),
    bankBalance:  row.bankBalance  || encrypt('0'),
    shopeeBalance:row.shopeeBalance|| encrypt('0'),
    balance:      row.balance      || encrypt('0'),
    cashDenoms:   row.cashDenoms   || encrypt('{}'),
    income:       row.income       || encrypt('0'),
    expense:      row.expense      || encrypt('0'),
    resetToken:       row.resetToken       || null,
    resetTokenExpiry: row.resetTokenExpiry ? new Date(row.resetTokenExpiry) : null,
    comparePassword(plain) { return bcrypt.compare(plain, this.password); },
    setBalances({ cashBalance, bankBalance, shopeeBalance, cashDenoms }) {
      this.cashBalance   = encrypt(String(cashBalance));
      this.bankBalance   = encrypt(String(bankBalance));
      this.shopeeBalance = encrypt(String(shopeeBalance || 0));
      this.balance       = encrypt(String(cashBalance + bankBalance + (shopeeBalance || 0)));
      this.cashDenoms    = encrypt(JSON.stringify(cashDenoms || {}));
    },
    getBalances() {
      return {
        cashBalance:   Number(decrypt(this.cashBalance))   || 0,
        bankBalance:   Number(decrypt(this.bankBalance))   || 0,
        shopeeBalance: Number(decrypt(this.shopeeBalance)) || 0,
        balance:       Number(decrypt(this.balance))       || 0,
        cashDenoms:    JSON.parse(decrypt(this.cashDenoms) || '{}'),
        income:        Number(decrypt(this.income))        || 0,
        expense:       Number(decrypt(this.expense))       || 0
      };
    },
    async save() {
      const d = getDb();
      d.prepare(`UPDATE users SET
        username=?, email=?, password=?,
        balance=?, cashBalance=?, bankBalance=?, shopeeBalance=?,
        cashDenoms=?, income=?, expense=?,
        resetToken=?, resetTokenExpiry=?,
        updatedAt=datetime('now')
        WHERE id=?`).run(
        this.username, this.email, this.password,
        this.balance, this.cashBalance, this.bankBalance, this.shopeeBalance,
        this.cashDenoms, this.income, this.expense,
        this.resetToken || null,
        this.resetTokenExpiry ? this.resetTokenExpiry.toISOString() : null,
        this.id
      );
    }
  };
}

const UserAdapter = {
  async findById(id) {
    const row = getDb().prepare('SELECT * FROM users WHERE id=?').get(id);
    return makeUserDoc(row);
  },
  async findOne(query) {
    const d = getDb();
    if (query.email) {
      const row = d.prepare('SELECT * FROM users WHERE email=?').get(query.email);
      return makeUserDoc(row);
    }
    if (query.resetToken) {
      const row = d.prepare('SELECT * FROM users WHERE resetToken=?').get(query.resetToken);
      return makeUserDoc(row);
    }
    if (query.$or) {
      for (const cond of query.$or) {
        if (cond.email) {
          const row = d.prepare('SELECT * FROM users WHERE email=?').get(cond.email);
          if (row) return makeUserDoc(row);
        }
        if (cond.username) {
          const row = d.prepare('SELECT * FROM users WHERE username=?').get(cond.username);
          if (row) return makeUserDoc(row);
        }
      }
    }
    return null;
  },
  async create({ username, email, password }) {
    const hashed = await bcrypt.hash(password, 10);
    const id = newId();
    getDb().prepare(`INSERT INTO users (id,username,email,password,balance,cashBalance,bankBalance,shopeeBalance,cashDenoms,income,expense)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, username, email, hashed,
      encrypt('0'), encrypt('0'), encrypt('0'), encrypt('0'), encrypt('{}'), encrypt('0'), encrypt('0')
    );
    return makeUserDoc(getDb().prepare('SELECT * FROM users WHERE id=?').get(id));
  },
  async findByIdAndUpdate(id, update) {
    const sets = Object.keys(update).map(k => `${k}=?`).join(',');
    getDb().prepare(`UPDATE users SET ${sets} WHERE id=?`).run(...Object.values(update), id);
  }
};

// ─── BALANCE HISTORY ─────────────────────────────────────────────────────────

function makeBalanceDoc(row) {
  if (!row) return null;
  return {
    _id: row.id,
    date: new Date(row.date),
    cashBalance:  row.cashBalance  || encrypt('0'),
    bankBalance:  row.bankBalance  || encrypt('0'),
    shopeeBalance:row.shopeeBalance|| encrypt('0'),
    total:        row.total        || encrypt('0'),
    cashDenoms:   row.cashDenoms   || encrypt('{}'),
    salary:       row.salary       || encrypt('0'),
    getDecrypted() {
      return {
        date:         row.date,
        cashBalance:  Number(decrypt(this.cashBalance))  || 0,
        bankBalance:  Number(decrypt(this.bankBalance))  || 0,
        shopeeBalance:Number(decrypt(this.shopeeBalance))|| 0,
        total:        Number(decrypt(this.total))        || 0,
        salary:       Number(decrypt(this.salary))       || 0,
      };
    }
  };
}

const BalanceHistoryAdapter = {
  async find(query) {
    const rows = getDb().prepare('SELECT * FROM balance_history WHERE userId=? ORDER BY date DESC').all(String(query.userId));
    return rows.map(makeBalanceDoc);
  },
  async create(data) {
    const id = newId();
    const ds = localDateStr(data.date);
    getDb().prepare(`INSERT OR IGNORE INTO balance_history (id,userId,date,cashBalance,bankBalance,shopeeBalance,total,cashDenoms,salary)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      id, String(data.userId), ds,
      data.cashBalance || encrypt('0'),
      data.bankBalance || encrypt('0'),
      data.shopeeBalance || encrypt('0'),
      data.total || encrypt('0'),
      data.cashDenoms || encrypt('{}'),
      data.salary || encrypt('0')
    );
    return makeBalanceDoc(getDb().prepare('SELECT * FROM balance_history WHERE id=?').get(id));
  },
  async findOneAndUpdate(query, update, opts = {}) {
    const d = getDb();
    let ds;
    if (query.date && query.date.$gte) {
      ds = localDateStr(query.date.$gte);
    } else if (query.date instanceof Date) {
      ds = localDateStr(query.date);
    }
    const userId = String(query.userId);
    const existing = d.prepare('SELECT * FROM balance_history WHERE userId=? AND date=?').get(userId, ds);
    const setData = update.$set || update;
    const onInsert = update.$setOnInsert || {};

    if (existing) {
      const sets = Object.keys(setData).map(k => `${k}=?`).join(',');
      d.prepare(`UPDATE balance_history SET ${sets} WHERE userId=? AND date=?`)
       .run(...Object.values(setData), userId, ds);
    } else if (opts.upsert) {
      const id = newId();
      const insertDs = onInsert.date ? localDateStr(onInsert.date) : ds;
      d.prepare(`INSERT OR REPLACE INTO balance_history (id,userId,date,cashBalance,bankBalance,shopeeBalance,total,cashDenoms,salary)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(
        id, userId, insertDs,
        setData.cashBalance || encrypt('0'),
        setData.bankBalance || encrypt('0'),
        setData.shopeeBalance || encrypt('0'),
        setData.total || encrypt('0'),
        setData.cashDenoms || encrypt('{}'),
        setData.salary || encrypt('0')
      );
    }
    return makeBalanceDoc(d.prepare('SELECT * FROM balance_history WHERE userId=? AND date=?').get(userId, ds));
  }
};

// Hỗ trợ chaining .sort() — trả về thenable object thay vì Promise thuần
BalanceHistoryAdapter.findOne = function(query) {
  const thenable = {
    _query: query,
    _sort: null,
    sort(opt) { this._sort = opt; return this; },
    then(resolve, reject) {
      const d = getDb();
      const userId = String(query.userId);
      let row;
      if (this._sort && this._sort.date === -1) {
        // Lấy record mới nhất
        row = d.prepare('SELECT * FROM balance_history WHERE userId=? ORDER BY date DESC LIMIT 1').get(userId);
      } else if (query.date && query.date.$gte) {
        const from = localDateStr(query.date.$gte);
        const to   = localDateStr(query.date.$lte);
        row = d.prepare('SELECT * FROM balance_history WHERE userId=? AND date>=? AND date<=? LIMIT 1').get(userId, from, to);
      } else if (query.date instanceof Date) {
        const ds = localDateStr(query.date);
        row = d.prepare('SELECT * FROM balance_history WHERE userId=? AND date=? LIMIT 1').get(userId, ds);
      }
      Promise.resolve(makeBalanceDoc(row)).then(resolve, reject);
    }
  };
  return thenable;
};

// ─── INCOME HISTORY ──────────────────────────────────────────────────────────

function makeIncomeDoc(row) {
  if (!row) return null;
  return {
    _id: row.id,
    date: new Date(row.date),
    total:      row.total      || encrypt('0'),
    bankAmount: row.bankAmount || encrypt('0'),
    cashAmount: row.cashAmount || encrypt('0'),
    cashDenoms: row.cashDenoms || encrypt('{}'),
    checkedIn:  !!row.checkedIn,
    getDecrypted() {
      return {
        date:      row.date,
        total:     Number(decrypt(this.total)) || 0,
        checkedIn: !!row.checkedIn
      };
    }
  };
}

const IncomeHistoryAdapter = {
  async findOne(query) {
    const d = getDb();
    const userId = String(query.userId);
    if (query.date instanceof Date) {
      const ds = localDateStr(query.date);
      const row = d.prepare('SELECT * FROM income_history WHERE userId=? AND date=? LIMIT 1').get(userId, ds);
      return makeIncomeDoc(row);
    }
    return null;
  },
  async find(query) {
    const d = getDb();
    const userId = String(query.userId);
    let sql = 'SELECT * FROM income_history WHERE userId=?';
    const params = [userId];
    if (query.checkedIn !== undefined) { sql += ' AND checkedIn=?'; params.push(query.checkedIn ? 1 : 0); }
    sql += ' ORDER BY date DESC';
    return d.prepare(sql).all(...params).map(makeIncomeDoc);
  },
  async findOneAndUpdate(query, update, opts = {}) {
    const d = getDb();
    const userId = String(query.userId);
    const ds = localDateStr(query.date);
    const existing = d.prepare('SELECT * FROM income_history WHERE userId=? AND date=?').get(userId, ds);
    if (existing) {
      const allowed = ['checkedIn','total','bankAmount','cashAmount','cashDenoms'];
      const sets = Object.keys(update).filter(k => allowed.includes(k)).map(k => `${k}=?`).join(',');
      const vals = Object.keys(update).filter(k => allowed.includes(k)).map(k =>
        k === 'checkedIn' ? (update[k] ? 1 : 0) : update[k]
      );
      if (sets) d.prepare(`UPDATE income_history SET ${sets} WHERE userId=? AND date=?`).run(...vals, userId, ds);
    } else if (opts.upsert) {
      const id = newId();
      d.prepare(`INSERT INTO income_history (id,userId,date,total,bankAmount,cashAmount,cashDenoms,checkedIn)
        VALUES (?,?,?,?,?,?,?,?)`).run(
        id, userId, ds,
        update.total || encrypt('0'),
        update.bankAmount || encrypt('0'),
        update.cashAmount || encrypt('0'),
        update.cashDenoms || encrypt('{}'),
        update.checkedIn ? 1 : 0
      );
    }
    return makeIncomeDoc(d.prepare('SELECT * FROM income_history WHERE userId=? AND date=?').get(userId, ds));
  }
};

// ─── EXPENSE HISTORY ─────────────────────────────────────────────────────────

function makeExpenseDoc(row) {
  if (!row) return null;
  return {
    _id: row.id,
    date: new Date(row.date),
    total:  row.total || encrypt('0'),
    note:   row.note  || '',
    source: row.source|| '',
    getDecrypted() {
      return {
        date:   row.date,
        total:  Number(decrypt(this.total)) || 0,
        note:   row.note  || '',
        source: row.source|| ''
      };
    }
  };
}

const ExpenseHistoryAdapter = {
  async find(query) {
    const rows = getDb().prepare('SELECT * FROM expense_history WHERE userId=? ORDER BY date DESC, createdAt DESC')
                        .all(String(query.userId));
    return rows.map(makeExpenseDoc);
  },
  async create(data) {
    const id = newId();
    const ds = localDateStr(data.date);
    getDb().prepare(`INSERT INTO expense_history (id,userId,date,total,note,source) VALUES (?,?,?,?,?,?)`)
           .run(id, String(data.userId), ds, data.total || encrypt('0'), data.note || '', data.source || '');
    return makeExpenseDoc(getDb().prepare('SELECT * FROM expense_history WHERE id=?').get(id));
  },
  async findOneAndUpdate(query, update, opts = {}) {
    // không dùng trong expense flow hiện tại
  }
};

// ─── SOURCE ──────────────────────────────────────────────────────────────────

function makeSourceDoc(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    userId: row.userId,
    name: row.name, icon: row.icon,
    type: row.type, currency: row.currency,
    disabled: !!row.disabled,
    createdAt: new Date(row.createdAt)
  };
}

const SourceAdapter = {
  async find(query) {
    const rows = getDb().prepare('SELECT * FROM sources WHERE userId=? ORDER BY createdAt ASC').all(String(query.userId));
    return rows.map(makeSourceDoc);
  },
  async findOne(query) {
    const d = getDb();
    if (query._id) {
      const row = d.prepare('SELECT * FROM sources WHERE id=? AND userId=?').get(String(query._id), String(query.userId));
      return makeSourceDoc(row);
    }
    return null;
  },
  async countDocuments(query) {
    return getDb().prepare('SELECT COUNT(*) as c FROM sources WHERE userId=?').get(String(query.userId)).c;
  },
  async insertMany(docs) {
    const insert = getDb().prepare('INSERT INTO sources (id,userId,name,icon,type) VALUES (?,?,?,?,?)');
    for (const doc of docs) insert.run(newId(), String(doc.userId), doc.name, doc.icon || 'fa-wallet', doc.type || 'number');
  },
  async create(data) {
    const id = newId();
    getDb().prepare('INSERT INTO sources (id,userId,name,icon,type) VALUES (?,?,?,?,?)').run(id, String(data.userId), data.name, data.icon || 'fa-wallet', data.type || 'number');
    return makeSourceDoc(getDb().prepare('SELECT * FROM sources WHERE id=?').get(id));
  },
  async findOneAndUpdate(query, update) {
    const d = getDb();
    const id = String(query._id);
    d.prepare(`UPDATE sources SET name=?,icon=?,type=?,disabled=?,currency=? WHERE id=? AND userId=?`)
     .run(update.name, update.icon, update.type || 'number', update.disabled ? 1 : 0, update.currency || 'VND', id, String(query.userId));
  },
  async findOneAndDelete(query) {
    getDb().prepare('DELETE FROM sources WHERE id=? AND userId=?').run(String(query._id), String(query.userId));
  },
  sort() { return this; }
};

// ─── CATEGORY ────────────────────────────────────────────────────────────────

function makeCategoryDoc(row) {
  if (!row) return null;
  return { _id: row.id, id: row.id, userId: row.userId, name: row.name, createdAt: new Date(row.createdAt) };
}

const CategoryAdapter = {
  async find(query) {
    const rows = getDb().prepare('SELECT * FROM categories WHERE userId=? ORDER BY createdAt ASC').all(String(query.userId));
    return rows.map(makeCategoryDoc);
  },
  async countDocuments(query) {
    return getDb().prepare('SELECT COUNT(*) as c FROM categories WHERE userId=?').get(String(query.userId)).c;
  },
  async insertMany(docs) {
    const insert = getDb().prepare('INSERT INTO categories (id,userId,name) VALUES (?,?,?)');
    for (const doc of docs) insert.run(newId(), String(doc.userId), doc.name);
  },
  async create(data) {
    const id = newId();
    getDb().prepare('INSERT INTO categories (id,userId,name) VALUES (?,?,?)').run(id, String(data.userId), data.name);
    return makeCategoryDoc(getDb().prepare('SELECT * FROM categories WHERE id=?').get(id));
  },
  async findOneAndUpdate(query, update) {
    getDb().prepare('UPDATE categories SET name=? WHERE id=? AND userId=?').run(update.name, String(query._id), String(query.userId));
  },
  async findOneAndDelete(query) {
    getDb().prepare('DELETE FROM categories WHERE id=? AND userId=?').run(String(query._id), String(query.userId));
  },
  sort() { return this; }
};

module.exports = {
  UserAdapter,
  BalanceHistoryAdapter,
  IncomeHistoryAdapter,
  ExpenseHistoryAdapter,
  SourceAdapter,
  CategoryAdapter
};
