const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    supplierTIN: { type: String, required: true },
    supplierName: { type: String, required: true },
    natureOfGoods: String,
    receiptNumber: { type: String, unique: true }, // To prevent double-importing the same receipt
    date: { type: Date, required: true },
    amountWithoutVAT: { type: Number, required: true },
    vat: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    importedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Purchase', purchaseSchema);