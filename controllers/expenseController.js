const Expense = require('../models/Expense');
const Project = require('../models/Project');
const logAction = require('../utils/logger');
const { generateExpensePDF } = require('../utils/pdfGenerator');

// 1. Get All Expenses
exports.getExpenses = async (req, res) => {
    try {
        const { projectId, page = 1 } = req.query;
        const limit = 15; // Set rows per page
        const skip = (page - 1) * limit;

        let query = {};
        if (projectId) query.projectId = projectId;

        // 1. Get total count for pagination logic
        const totalExpenses = await Expense.countDocuments(query);
        const totalPages = Math.ceil(totalExpenses / limit);

        // 2. Fetch the 15 records for current page
        const expenses = await Expense.find(query)
            .populate('projectId')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const projects = await Project.find().lean();
        
        // Total for ONLY the 15 rows displayed or all? 
        // Usually, users want the grand total for that filter:
        const allFiltered = await Expense.find(query);
        const totalAmount = allFiltered.reduce((sum, exp) => sum + exp.amount, 0);

        res.render('expenses', { 
            expenses, 
            projects, 
            selectedProject: projectId,
            totalAmount,
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
        res.status(500).send("Error loading expenses");
    }
};

//  create new expense
exports.createExpense = async (req, res) => {
    try {
        const { name, recipientPhone, amount, reason, projectId, mode, date } = req.body;
        
        const newExpense = await Expense.create({
            name,
            recipientPhone, // Saved here
            amount,
            reason,
            projectId,
            mode,
            date: date || Date.now(),
            createdBy: req.user._id
        });

        await logAction(
            req.user._id, 
            'CREATE', 
            'Expense', 
            newExpense._id, 
            `Sent ${amount} RWF to ${recipientPhone} (${name}) for ${reason}`
        );
        
        res.redirect('/expenses');
    } catch (err) {
        res.status(500).send("Error saving expense");
    }
};

// 3. Delete Expense
exports.deleteExpense = async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        await logAction(req.user._id, 'DELETE', 'Expense', req.params.id, `Deleted an expense entry`);
        res.redirect('/expenses');
    } catch (err) {
        res.status(500).send("Error deleting expense");
    }
};


// MAKE SURE THIS IS PRESENT AND SPELLED CORRECTLY
exports.updateExpense = async (req, res) => {
    try {
        const { name, recipientPhone, amount, reason, projectId, mode } = req.body;
        await Expense.findByIdAndUpdate(req.params.id, {
            name, 
            recipientPhone, 
            amount, 
            reason, 
            projectId, 
            mode
        });
        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating expense");
    }
};

// Ensure deleteExpense is also exported
exports.deleteExpense = async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.redirect('/expenses');
    } catch (err) {
        res.status(500).send("Error deleting expense");
    }
};


// Make sure this is exported correctly
exports.downloadPDF = async (req, res) => {
    try {
        const { projectId } = req.query;
        let query = {};
        if (projectId) query.projectId = projectId;

        // Fetch data
        const expenses = await Expense.find(query).populate('projectId').lean();
        const projects = await Project.find().lean();
        
        const selectedProjectName = projectId 
            ? projects.find(p => p._id.toString() === projectId)?.projectName 
            : "All Projects";
            
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Generate PDF using the utility we created in the previous step
        const pdfBuffer = generateExpensePDF(expenses, selectedProjectName, totalAmount);

        // Send file to browser
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SmartBuild_Report_${Date.now()}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error("PDF Error:", err);
        res.status(500).send("Error generating PDF: " + err.message);
    }
};