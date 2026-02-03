const mongoose = require('mongoose'); // <--- ADD THIS LINE

const CasualPaymentSchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CasualWorker', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    activity: { type: String, required: true },
    date: { type: Date, default: Date.now },
    netAmount: { type: Number, required: true }, 
    taxAmount: { type: Number, required: true }, 
    totalExpense: { type: Number, required: true }, 
    paymentMethod: { type: String, enum: ['Cash', 'Mobile Money'], required: true },
    momoRef: { type: String } 
});

module.exports = mongoose.model('CasualPayment', CasualPaymentSchema);