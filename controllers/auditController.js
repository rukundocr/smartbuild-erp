const AuditLog = require('../models/AuditLog');
// get all logs 
exports.getLogs = async (req, res) => {
    try {
        const { startDate, endDate, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        let query = {};
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }

        const totalLogs = await AuditLog.countDocuments(query);
        const totalPages = Math.ceil(totalLogs / limit);

        // We use .populate('createdBy') but add .lean() for performance
        const logs = await AuditLog.find(query)
            .populate('createdBy', 'name') 
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('audit-log', { 
            logs, 
            startDate, 
            endDate,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                prevPage: parseInt(page) - 1,
                nextPage: parseInt(page) + 1
            }
        });
    } catch (err) {
        // This will print the SPECIFIC error in your terminal/console
        console.error("FULL ERROR DETAILS:", err); 
        res.status(500).send("Error loading audit logs: " + err.message);
    }
};

// delete all audit logs 
exports.clearLogs = async (req, res) => {
    try {
        await AuditLog.deleteMany({});
        res.redirect('/audit');
    } catch (err) {
        console.error("Error clearing logs:", err);
        res.status(500).send("Error clearing logs");
    }
};