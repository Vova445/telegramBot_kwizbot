const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    orderId: { type: String, required: true, unique: true },
    status: { type: String },
    details: { type: String },
}, { collection: 'kwizbot' });

module.exports = mongoose.model('Order', orderSchema);
