const Expense = require('../models/Expense');
const Project = require('../models/Project');
const logAction = require('../utils/logger');
const { generateExpensePDF } = require('../utils/pdfGenerator');


// 1. Get All Expenses (Updated with Date Range Filtering)
exports.getExpenses = async (req, res) => {
    try {
        const { projectId, page = 1, startDate, endDate } = req.query;
        const limit = 15; 
        const skip = (page - 1) * limit;

        let query = {};
        
        // Filter by Project if selected
        if (projectId) query.projectId = projectId;

        // Filter by Date Range if provided
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // Get total count for pagination
        const totalExpenses = await Expense.countDocuments(query);
        const totalPages = Math.ceil(totalExpenses / limit);

        // Fetch paginated records
        const expenses = await Expense.find(query)
            .populate('projectId')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const projects = await Project.find().lean();
        
        // Calculate Grand Total for the filtered results
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

// ... include your other exports like createExpense, updateExpense, deleteExpense here

//  create new expense
exports.createExpense = async (req, res) => {
    try {
        const { name, recipientPhone, amount, reason, projectId, mode, date } = req.body;
        
        // 1. Create the Expense record
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

        // 2. Fetch project info to make the audit log more descriptive
        const project = await Project.findById(projectId);
        const projectName = project ? project.projectName : 'Unknown Project';

        // 3. Record in Audit Log
        // Structure: action, module, details
        await logAction(
            'CREATE_EXPENSE', 
            'Expenses', 
            `User ${req.user.name || 'Admin'} recorded ${amount} RWF for "${reason}" at ${projectName}. Recipient: ${name} (${recipientPhone}).`
        );
        
        res.redirect('/expenses');
    } catch (err) {
        console.error("Error saving expense:", err);
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