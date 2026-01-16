const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Recipient's name
    recipientPhone: { type: String, required: true }, // Added for MoMo/SMS tracking
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    mode: { 
        type: String, 
        enum: ['Cash', 'Mobile Money', 'Bank Transfer'], 
        default: 'Mobile Money' 
    },
    reason: { type: String, required: true },
    projectId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true 
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);