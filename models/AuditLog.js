const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., "CREATE", "DELETE"
    module: { type: String, required: true }, // e.g., "SALES", "PROJECTS"
    details: { type: String },                // e.g., "Deleted Project: Villa A"
    resourceId: { type: String },             // Added to store the ID of the document
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);