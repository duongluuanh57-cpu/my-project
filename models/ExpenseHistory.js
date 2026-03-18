const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const expenseHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:   { type: Date, required: true },
  total:  { type: String, default: () => encrypt('0') },
  note:   { type: String, default: '' },
  source: { type: String, default: '' }
}, { timestamps: true });

expenseHistorySchema.index({ userId: 1, date: 1 });

expenseHistorySchema.methods.getDecrypted = function () {
  const d = this.date;
  const pad = n => n < 10 ? '0' + n : '' + n;
  const localDate = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  return {
    date:   localDate,
    total:  Number(decrypt(this.total)) || 0,
    note:   this.note || '',
    source: this.source || ''
  };
};

module.exports = mongoose.model('ExpenseHistory', expenseHistorySchema);
