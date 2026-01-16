const AuditLog = require('../models/AuditLog');

const logAction = async (userId, action, collection, targetId, details = '') => {
    try {
        await AuditLog.create({
            user: userId,
            action: action,
            targetCollection: collection,
            targetId: targetId,
            details: details
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

module.exports = logAction;