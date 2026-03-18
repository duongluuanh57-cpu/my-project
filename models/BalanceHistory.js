const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const balanceHistorySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: Date, required: true },
  cashBalance: { type: String, default: () => encrypt('0') },
  bankBalance: { type: String, default: () => encrypt('0') },
  shopeeBalance: { type: String, default: () => encrypt('0') },
  total:       { type: String, default: () => encrypt('0') },
  cashDenoms:  { type: String, default: () => encrypt('{}') },
  salary:      { type: String, default: () => encrypt('0') }
}, { timestamps: true });

balanceHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

// Decrypt khi đọc ra
balanceHistorySchema.methods.getDecrypted = function () {
  const d = this.date;
  const pad = n => n < 10 ? '0' + n : '' + n;
  const localDate = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  return {
    date:          localDate,
    cashBalance:   Number(decrypt(this.cashBalance))   || 0,
    bankBalance:   Number(decrypt(this.bankBalance))   || 0,
    shopeeBalance: this.shopeeBalance ? (Number(decrypt(this.shopeeBalance)) || 0) : 0,
    total:         Number(decrypt(this.total))         || 0,
    salary:        this.salary ? (Number(decrypt(this.salary)) || 0) : 0,
  };
};

module.exports = mongoose.model('BalanceHistory', balanceHistorySchema);
