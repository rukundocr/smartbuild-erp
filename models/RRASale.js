const mongoose = require('mongoose');

const RRASaleSchema = new mongoose.Schema({
    buyerTIN: { type: String, required: true },
    buyerName: { type: String },
    natureOfGoods: { type: String },
    receiptNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    totalAmountExclVAT: { type: Number, default: 0 },
    taxableSales: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    importedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RRASale', RRASaleSchema);