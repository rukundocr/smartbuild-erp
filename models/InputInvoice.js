const mongoose = require('mongoose');

const InputInvoiceSchema = new mongoose.Schema({
    supplierName: { type: String, required: true },
    supplierTin: { type: String },
    invoiceNumber: { type: String },
    date: { type: Date, required: true },
    amountWithoutVat: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('InputInvoice', InputInvoiceSchema);