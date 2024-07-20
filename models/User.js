const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  chatId: { type: Number },
  city: { type: String },
  orderId: { type: String, default: '', unique: true }
}, { collection: 'kwizbot' });

module.exports = mongoose.model('User', userSchema);
