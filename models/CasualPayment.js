const mongoose = require('mongoose');

const CasualPaymentSchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CasualWorker', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    activity: { type: String, required: true },
    // This 'date' will be the one you pick in the calendar (Work Date)
    date: { type: Date, required: true }, 
    netAmount: { type: Number, required: true }, 
    taxAmount: { type: Number, required: true }, 
    totalExpense: { type: Number, required: true }, 
    paymentMethod: { type: String, enum: ['Cash', 'Mobile Money'], required: true },
    momoRef: { type: String } 
}, { 
    timestamps: true // <--- ADD THIS: Captures the real-world system time automatically
});

module.exports = mongoose.model('CasualPayment', CasualPaymentSchema);