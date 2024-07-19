const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    phone: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: String, default: null }
}, { collection: 'kwizbot' });

module.exports = mongoose.model('Message', messageSchema);
