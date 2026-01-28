
const AuditLog = require('../models/AuditLog');

exports.logAction = async (userId, action, module, resourceId, details) => {
    try {
        await AuditLog.create({
            createdBy: userId,
            action: action.toUpperCase(),
            module: module.toUpperCase(),
            resourceId: resourceId ? resourceId.toString() : null,
            details,
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Audit Logging failed:", err);
    }
};