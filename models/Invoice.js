const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    siteLocation: { type: String, required: true },
    date: { type: Date, default: Date.now },
    items: [{
        itemName: String,
        specs: String,
        unit: String,
        qty: Number,
        unitPrice: Number,
        totalPrice: Number
    }],
    projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
},
    subtotal: { type: Number, required: true },
    vatAmount: { type: Number, required: true }, // 18%
    grandTotal: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);