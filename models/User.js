const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/crypto');

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  // Lưu dạng encrypted string
  balance:     { type: String, default: () => encrypt('0') },
  cashBalance: { type: String, default: () => encrypt('0') },
  bankBalance: { type: String, default: () => encrypt('0') },
  shopeeBalance: { type: String, default: () => encrypt('0') },
  cashDenoms:  { type: String, default: () => encrypt('{}') },
  income:      { type: String, default: () => encrypt('0') },
  expense:     { type: String, default: () => encrypt('0') },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Helper để set/get balance dạng số
userSchema.methods.setBalances = function ({ cashBalance, bankBalance, shopeeBalance, cashDenoms }) {
  this.cashBalance   = encrypt(String(cashBalance));
  this.bankBalance   = encrypt(String(bankBalance));
  this.shopeeBalance = encrypt(String(shopeeBalance || 0));
  this.balance       = encrypt(String(cashBalance + bankBalance + (shopeeBalance || 0)));
  this.cashDenoms    = encrypt(JSON.stringify(cashDenoms || {}));
};

userSchema.methods.getBalances = function () {
  return {
    cashBalance:   Number(decrypt(this.cashBalance))   || 0,
    bankBalance:   Number(decrypt(this.bankBalance))   || 0,
    shopeeBalance: Number(decrypt(this.shopeeBalance)) || 0,
    balance:       Number(decrypt(this.balance))       || 0,
    cashDenoms:    JSON.parse(decrypt(this.cashDenoms) || '{}'),
    income:        Number(decrypt(this.income))        || 0,
    expense:       Number(decrypt(this.expense))       || 0
  };
};

module.exports = mongoose.model('User', userSchema);
