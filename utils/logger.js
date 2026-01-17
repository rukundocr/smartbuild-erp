const AuditLog = require('../models/AuditLog');

exports.logAction = async (userId, action, module, resourceId, details) => {
    try {
        await AuditLog.create({
            createdBy: userId, // Ensure your Model has this field
            action,
            module,
            resourceId, // Ensure your Model has this field
            details,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Logging failed:", err);
    }
};