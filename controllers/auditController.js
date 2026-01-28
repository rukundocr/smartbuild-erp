const AuditLog = require('../models/AuditLog');
const User = require('../models/User'); // Import User for the filter dropdown
const { Parser } = require('json2csv');

// get all logs 
exports.getLogs = async (req, res) => {
    try {
        const { startDate, endDate, module, action, userId, page = 1 } = req.query;
        const limit = 20;
        const skip = (page - 1) * limit;

        let query = {};

        // Date Filtering
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }

        // Module Filtering
        if (module) query.module = module;

        // Action Filtering
        if (action) query.action = action;

        // User Filtering
        if (userId) query.createdBy = userId;

        const totalLogs = await AuditLog.countDocuments(query);
        const totalPages = Math.ceil(totalLogs / limit);

        const logs = await AuditLog.find(query)
            .populate('createdBy', 'name') 
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Fetch unique values for filter dropdowns
        const users = await User.find().select('name').lean();
        const modules = await AuditLog.distinct('module');
        const actions = await AuditLog.distinct('action');

        res.render('audit-log', { 
            logs, 
            users,
            modules,
            actions,
            startDate, 
            endDate,
            selectedModule: module,
            selectedAction: action,
            selectedUser: userId,
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
        console.error("FULL ERROR DETAILS:", err); 
        res.status(500).send("Error loading audit logs: " + err.message);
    }
};

// Clear logs (remains the same)
exports.clearLogs = async (req, res) => {
    try {
        await AuditLog.deleteMany({});
        res.redirect('/audit');
    } catch (err) {
        console.error("Error clearing logs:", err);
        res.status(500).send("Error clearing logs");
    }
};

exports.exportLogsCSV = async (req, res) => {
    try {
        const { startDate, endDate, module, action, userId } = req.query;
        let query = {};

        // Apply same filters as the list view
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }
        if (module) query.module = module;
        if (action) query.action = action;
        if (userId) query.createdBy = userId;

        const logs = await AuditLog.find(query)
            .populate('createdBy', 'name')
            .sort({ timestamp: -1 })
            .lean();

        const fields = [
            { label: 'Date', value: (row) => row.timestamp.toLocaleString() },
            { label: 'User', value: (row) => row.createdBy ? row.createdBy.name : 'System' },
            { label: 'Action', value: 'action' },
            { label: 'Module', value: 'module' },
            { label: 'Details', value: 'details' },
            { label: 'Resource ID', value: 'resourceId' }
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(logs);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Error exporting logs");
    }
};