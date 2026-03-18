/**
 * Trả về Mongoose model hoặc SQLite adapter tùy theo global.USE_SQLITE
 */
const {
  UserAdapter,
  BalanceHistoryAdapter,
  IncomeHistoryAdapter,
  ExpenseHistoryAdapter,
  SourceAdapter,
  CategoryAdapter
} = require('./sqlite');

function makeProxy(MongooseModel, SqliteAdapter) {
  return new Proxy({}, {
    get(_, prop) {
      const target = global.USE_SQLITE ? SqliteAdapter : MongooseModel;
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    }
  });
}

// Lazy-load Mongoose models để tránh lỗi khi mongoose chưa connect
module.exports = {
  get User()           { return makeProxy(require('../models/User'),           UserAdapter); },
  get BalanceHistory() { return makeProxy(require('../models/BalanceHistory'), BalanceHistoryAdapter); },
  get IncomeHistory()  { return makeProxy(require('../models/IncomeHistory'),  IncomeHistoryAdapter); },
  get ExpenseHistory() { return makeProxy(require('../models/ExpenseHistory'), ExpenseHistoryAdapter); },
  get Source()         { return makeProxy(require('../models/Source'),         SourceAdapter); },
  get Category()       { return makeProxy(require('../models/Category'),       CategoryAdapter); },
};
