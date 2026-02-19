const CasualWorker = require('../models/CasualWorker');
const CasualPayment = require('../models/CasualPayment');
const Project = require('../models/Project');
const { logAction } = require('../utils/logger');

// 1. Display Worker List & Registration Form
exports.getWorkers = async (req, res) => {
    try {
        const workers = await CasualWorker.find().sort({ createdAt: -1 }).lean();
        const projects = await Project.find().lean();
        res.render('casual-workers', { workers, projects, title: 'Casual Workers' });
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// 2. Register New Worker
exports.registerWorker = async (req, res) => {
    try {
        const { firstName, lastName, idNumber, phoneNumber } = req.body;
        const newWorker = await CasualWorker.create({ firstName, lastName, idNumber, phoneNumber });

        await logAction(req.user._id, 'CREATE', 'CASUAL_WORKERS', newWorker._id, `Registered casual worker: ${firstName} ${lastName}`);
        res.redirect('/casual-workers');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering worker. ID might already exist.");
    }
};

// 3. Update Worker Details
exports.updateWorker = async (req, res) => {
    try {
        const { firstName, lastName, idNumber, phoneNumber } = req.body;

        // Fetch old for audit trail
        const oldWorker = await CasualWorker.findById(req.params.id);

        const updatedWorker = await CasualWorker.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, idNumber, phoneNumber },
            { new: true }
        );

        const changes = [];
        if (oldWorker.firstName !== firstName || oldWorker.lastName !== lastName)
            changes.push(`Name: "${oldWorker.firstName} ${oldWorker.lastName}" → "${firstName} ${lastName}"`);
        if (oldWorker.idNumber !== idNumber) changes.push(`ID: "${oldWorker.idNumber}" → "${idNumber}"`);
        if (oldWorker.phoneNumber !== phoneNumber) changes.push(`Phone: "${oldWorker.phoneNumber}" → "${phoneNumber}"`);

        await logAction(req.user._id, 'UPDATE', 'CASUAL_WORKERS', updatedWorker._id,
            `Updated worker ${firstName} ${lastName}. Changes: ${changes.length > 0 ? changes.join(', ') : 'Minor update'}`);
        res.redirect('/casual-workers');
    } catch (err) {
        res.status(500).send("Update Error");
    }
};

// 4. Process Payment with 15% WHT and Custom Date
// 4. Process Payment with 15% WHT and Custom Date
exports.processPayment = async (req, res) => {
    try {
        const { workerId, projectId, activity, amount, paymentMethod, momoRef, date } = req.body;

        const netAmount = parseFloat(amount);
        const taxAmount = netAmount * 0.15;
        const totalExpense = netAmount + taxAmount;

        // FIX: Ensure we only save the date part (YYYY-MM-DD) to prevent timezone shifts
        const workDate = date ? new Date(date) : new Date();
        workDate.setHours(0, 0, 0, 0);

        // Fetch worker and project names for a meaningful log
        const [worker, project] = await Promise.all([
            CasualWorker.findById(workerId),
            Project.findById(projectId)
        ]);
        const workerName = worker ? `${worker.firstName} ${worker.lastName}` : workerId;
        const projectName = project ? project.projectName : (projectId || 'N/A');

        const payment = await CasualPayment.create({
            workerId, projectId, activity, netAmount, taxAmount, totalExpense,
            paymentMethod, momoRef, date: workDate
        });

        await logAction(req.user._id, 'CREATE', 'CASUAL_PAYMENTS', payment._id,
            `Paid ${netAmount.toLocaleString()} RWF (WHT: ${taxAmount.toLocaleString()} RWF) to "${workerName}" for "${activity}" on project "${projectName}". Method: ${paymentMethod}. Date: ${date}`);

        res.redirect('/casual-workers/payments');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing payment.");
    }
};
// 5. View All Payments
// 5. View All Payments (WITH BACKEND FILTERING)
exports.getPaymentHistory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        // If dates are provided, build the MongoDB date range query
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the entire end day
                query.date.$lte = end;
            }
        }

        const payments = await CasualPayment.find(query)
            .populate('workerId')
            .populate('projectId')
            .sort({ date: -1 })
            .lean();

        // Calculate totals in backend to ensure 100% accuracy
        const totals = payments.reduce((acc, p) => {
            acc.net += p.netAmount || 0;
            acc.tax += p.taxAmount || 0;
            acc.total += p.totalExpense || 0;
            return acc;
        }, { net: 0, tax: 0, total: 0 });

        res.render('casual-workers/payments', {
            payments,
            totals,
            filters: { startDate, endDate }, // Pass back to frontend to keep inputs filled
            title: 'Payment History'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading history");
    }
};

// 6. FETCH DATA FOR EDIT MODAL (Payments)
exports.getEditPayment = async (req, res) => {
    try {
        const payment = await CasualPayment.findById(req.params.id).lean();
        if (!payment) return res.status(404).json({ error: "Not found" });
        res.json(payment);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
};

// 7. UPDATE PAYMENT
exports.updatePayment = async (req, res) => {
    try {
        const { activity, amount, paymentMethod, momoRef, date } = req.body;
        const netAmount = parseFloat(amount);
        const taxAmount = netAmount * 0.15;
        const totalExpense = netAmount + taxAmount;

        // Fetch old payment for audit trail
        const oldPayment = await CasualPayment.findById(req.params.id).populate('workerId');

        let updateData = { activity, netAmount, taxAmount, totalExpense, paymentMethod, momoRef };

        if (date) {
            const workDate = new Date(date);
            workDate.setHours(0, 0, 0, 0);
            updateData.date = workDate;
        }

        const updatedPayment = await CasualPayment.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('workerId');

        const changes = [];
        if (oldPayment.netAmount !== netAmount) changes.push(`Amount: ${oldPayment.netAmount.toLocaleString()} → ${netAmount.toLocaleString()} RWF`);
        if (oldPayment.activity !== activity) changes.push(`Activity: "${oldPayment.activity}" → "${activity}"`);
        if (oldPayment.paymentMethod !== paymentMethod) changes.push(`Method: "${oldPayment.paymentMethod}" → "${paymentMethod}"`);

        const workerName = updatedPayment.workerId ? `${updatedPayment.workerId.firstName} ${updatedPayment.workerId.lastName}` : 'Unknown';
        await logAction(
            req.user._id, 'UPDATE', 'CASUAL_PAYMENTS', req.params.id,
            `Updated payment for "${workerName}". Changes: ${changes.length > 0 ? changes.join(', ') : 'Minor update'}`
        );

        res.redirect('/casual-workers/payments');
    } catch (err) {
        res.status(500).send("Update Error");
    }
};
// 8. DELETE PAYMENT
exports.deletePayment = async (req, res) => {
    try {
        const payment = await CasualPayment.findById(req.params.id).populate('workerId');
        if (!payment) return res.redirect('/casual-workers/payments');

        const workerName = payment.workerId ? `${payment.workerId.firstName} ${payment.workerId.lastName}` : 'Unknown Worker';

        await CasualPayment.findByIdAndDelete(req.params.id);

        await logAction(
            req.user._id,
            'DELETE',
            'CASUAL_PAYMENTS',
            req.params.id,
            `Deleted payment of ${payment.netAmount} RWF for ${workerName} (Activity: ${payment.activity || 'N/A'})`
        );

        res.redirect('/casual-workers/payments');
    } catch (err) {
        res.status(500).send("Delete Error");
    }
};