const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    lenderName: { type: String, required: true },
    description: { type: String }, // e.g., "Loan for materials" or "Employee Advance"
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    dateBorrowed: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['Active', 'Cleared'], 
        default: 'Active' 
    },
    payments: [{
        amount: Number,
        date: { type: Date, default: Date.now },
        note: String
    }]
}, { timestamps: true });

// Virtual for remaining balance
loanSchema.virtual('remainingBalance').get(function() {
    return this.totalAmount - this.amountPaid;
});

module.exports = mongoose.model('Loan', loanSchema);