const CasualWorker = require('../models/CasualWorker');
const CasualPayment = require('../models/CasualPayment');
const Project = require('../models/Project');
const { logAction } = require('../utils/logger');

// Display Worker List & Registration Form
exports.getWorkers = async (req, res) => {
    try {
        const workers = await CasualWorker.find().sort({ createdAt: -1 }).lean();
        const projects = await Project.find().lean();
        res.render('casual-workers', { workers, projects, title: 'Casual Workers' });
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// Register New Worker
exports.registerWorker = async (req, res) => {
    try {
        const { firstName, lastName, idNumber, phoneNumber } = req.body;
        const newWorker = await CasualWorker.create({ firstName, lastName, idNumber, phoneNumber });
        
        await logAction(req.user._id, 'CREATE', 'CASUAL_WORKERS', newWorker._id, `Registered casual worker: ${firstName} ${lastName}`);
        res.redirect('/casual-workers');
    } catch (err) {
        res.status(500).send("Error registering worker. ID might already exist.");
    }
};

// Process Payment with 15% WHT
exports.processPayment = async (req, res) => {
    try {
        const { workerId, projectId, activity, amount, paymentMethod, momoRef } = req.body;
        
        const netAmount = parseFloat(amount);
        const taxAmount = netAmount * 0.15; // 15% Withholding Tax
        const totalExpense = netAmount + taxAmount;

        const payment = await CasualPayment.create({
            workerId,
            projectId,
            activity,
            netAmount,
            taxAmount,
            totalExpense,
            paymentMethod,
            momoRef
        });

        await logAction(req.user._id, 'CREATE', 'CASUAL_PAYMENTS', payment._id, 
            `Paid ${netAmount} RWF to worker. Tax: ${taxAmount} RWF. Total Expense: ${totalExpense} RWF`);

        res.redirect('/casual-workers/payments');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error processing payment.");
    }
};

// View All Payments
exports.getPaymentHistory = async (req, res) => {
    try {
        const payments = await CasualPayment.find()
            .populate('workerId')
            .populate('projectId')
            .sort({ date: -1 })
            .lean();
        res.render('casual-workers/payments', { payments, title: 'Payment History' });
    } catch (err) {
        res.status(500).send("Error loading history");
    }
};

// FETCH DATA FOR EDIT MODAL
exports.getEditPayment = async (req, res) => {
    try {
        const payment = await CasualPayment.findById(req.params.id).lean();
        if (!payment) return res.status(404).json({ error: "Not found" });
        res.json(payment); 
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
};

// UPDATE PAYMENT
exports.updatePayment = async (req, res) => {
    try {
        const { activity, amount, paymentMethod } = req.body;
        const netAmount = parseFloat(amount);
        const taxAmount = netAmount * 0.15;
        const totalExpense = netAmount + taxAmount;

        await CasualPayment.findByIdAndUpdate(req.params.id, {
            activity,
            netAmount,
            taxAmount,
            totalExpense,
            paymentMethod
        });
        res.redirect('/casual-workers/payments');
    } catch (err) {
        res.status(500).send("Update Error");
    }
};

// DELETE PAYMENT
exports.deletePayment = async (req, res) => {
    try {
        await CasualPayment.findByIdAndDelete(req.params.id);
        res.redirect('/casual-workers/payments');
    } catch (err) {
        res.status(500).send("Delete Error");
    }
};