const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const incomeHistorySchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:       { type: Date, required: true },
  total:      { type: String, default: () => encrypt('0') },
  bankAmount: { type: String, default: () => encrypt('0') },
  cashAmount: { type: String, default: () => encrypt('0') },
  cashDenoms: { type: String, default: () => encrypt('{}') },
  checkedIn:  { type: Boolean, default: false }
}, { timestamps: true });

incomeHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

incomeHistorySchema.methods.getDecrypted = function () {
  const d = this.date;
  const pad = n => n < 10 ? '0' + n : '' + n;
  const localDate = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  return {
    date:      localDate,
    total:     Number(decrypt(this.total)) || 0,
    checkedIn: this.checkedIn || false
  };
};

module.exports = mongoose.model('IncomeHistory', incomeHistorySchema);
