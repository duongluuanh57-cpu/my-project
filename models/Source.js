const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true },
  icon:   { type: String, default: 'fa-wallet' },
  type:     { type: String, default: 'number', enum: ['cash', 'number'] },
  currency: { type: String, default: 'VND' },
  disabled: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Source', sourceSchema);
