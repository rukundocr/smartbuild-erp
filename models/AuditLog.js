const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { 
        type: String, 
        enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'], 
        required: true 
    },
    targetCollection: { type: String, required: true }, // e.g., 'Project' or 'Expense'
    targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the changed item
    details: { type: String }, // e.g., "Updated contract amount from 5M to 7M"
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);