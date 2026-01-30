const Expense = require('../models/Expense');
const Project = require('../models/Project');
const { logAction } = require('../utils/logger'); // Ensure destructured import
const { generateExpensePDF } = require('../utils/pdfGenerator');

// 1. Get All Expenses
exports.getExpenses = async (req, res) => {
    try {
        const { projectId, page = 1, startDate, endDate } = req.query;
        const limit = 15; 
        const skip = (page - 1) * limit;

        let query = {};
        if (projectId) query.projectId = projectId;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const totalExpenses = await Expense.countDocuments(query);
        const totalPages = Math.ceil(totalExpenses / limit);

        const expenses = await Expense.find(query)
            .populate('projectId')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const projects = await Project.find().lean();
        
        const allFiltered = await Expense.find(query).select('amount');
        const totalAmount = allFiltered.reduce((sum, exp) => sum + exp.amount, 0);

        res.render('expenses', { 
            expenses, 
            projects, 
            selectedProject: projectId,
            startDate, 
            endDate,
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
        console.error("Error loading expenses:", err);
        res.status(500).send("Error loading expenses");
    }
};

// 2. Create new expense
exports.createExpense = async (req, res) => {
    try {
        const { name, recipientPhone, amount, reason, projectId, mode, date } = req.body;
        
        const newExpense = await Expense.create({
            name,
            recipientPhone,
            amount,
            reason,
            projectId,
            mode,
            date: date || Date.now(),
            createdBy: req.user._id
        });

        const project = await Project.findById(projectId);
        const projectName = project ? project.projectName : 'Unknown Project';

        // AUDIT LOG
        await logAction(
            req.user._id,
            'CREATE',
            'EXPENSES',
            newExpense._id,
            `Recorded ${amount} RWF for "${reason}" at ${projectName}. Recipient: ${name}.`
        );
        
        res.redirect('/expenses');
    } catch (err) {
        console.error("Error saving expense:", err);
        res.status(500).send("Error saving expense");
    }
};

// 3. Update Expense
exports.updateExpense = async (req, res) => {
    try {
        const { name, recipientPhone, amount, reason, projectId, mode } = req.body;
        
        const oldExpense = await Expense.findById(req.params.id);
        const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, {
            name, 
            recipientPhone, 
            amount, 
            reason, 
            projectId, 
            mode
        }, { new: true });

        // AUDIT LOG
        await logAction(
            req.user._id,
            'UPDATE',
            'EXPENSES',
            req.params.id,
            `Updated expense. Amount changed from ${oldExpense.amount} to ${amount} RWF. Reason: ${reason}`
        );

        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating expense");
    }
};

// 4. Delete Expense
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.redirect('/expenses');

        const deletedAmount = expense.amount;
        const deletedReason = expense.reason;

        await Expense.findByIdAndDelete(req.params.id);

        // AUDIT LOG
        await logAction(
            req.user._id,
            'DELETE',
            'EXPENSES',
            req.params.id,
            `Deleted expense of ${deletedAmount} RWF (Reason: ${deletedReason})`
        );

        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting expense");
    }
};

// 5. Download PDF
exports.downloadPDF = async (req, res) => {
    try {
        const { projectId } = req.query;
        let query = {};
        if (projectId) query.projectId = projectId;

        const expenses = await Expense.find(query).populate('projectId').lean();
        const projects = await Project.find().lean();
        
        const selectedProjectName = projectId 
            ? projects.find(p => p._id.toString() === projectId)?.projectName 
            : "All Projects";
            
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // AUDIT LOG: Logging the report generation
        await logAction(
            req.user._id,
            'EXPORT',
            'EXPENSES',
            projectId || 'ALL',
            `Generated Expense PDF Report for ${selectedProjectName}`
        );

        const pdfBuffer = generateExpensePDF(expenses, selectedProjectName, totalAmount);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SmartBuild_Report_${Date.now()}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error("PDF Error:", err);
        res.status(500).send("Error generating PDF: " + err.message);
    }
};

exports.linkProject = async (req, res) => {
    try {
        const { projectId } = req.body;
        const expense = await Expense.findByIdAndUpdate(
            req.params.id, 
            { projectId }, 
            { new: true }
        ).populate('projectId');
        
        if (!expense) return res.redirect('/expenses');

        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'UPDATE',
            'EXPENSES',
            expense._id,
            `Mapped expense (${expense.reason}) to project: ${expense.projectId ? expense.projectId.projectName : 'Unlinked'}`
        );

        res.redirect('/expenses');
    } catch (err) {
        console.error("Linking Error:", err);
        res.status(500).send("Error linking project to expense.");
    }
};