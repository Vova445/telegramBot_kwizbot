const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  firstName: { type: String },
  lastName: { type: String },
  chatId: { type: Number },
  city: { type: String } 
}, { collection: 'kwizbot' });

module.exports = mongoose.model('User', userSchema);
