

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    module: { type: String, required: true },
    details: { type: String },
    // This MUST match the field name used in .populate('createdBy')
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);