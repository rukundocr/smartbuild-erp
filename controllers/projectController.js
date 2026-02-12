const Project = require('../models/Project');
const Expense = require('../models/Expense');
const { logAction } = require('../utils/logger');
const PurchaseValue = require('../models/Purchase');
const SaleValue = require('../models/RRASale');

// 1. Dashboard Logic
exports.getDashboard = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        const expenses = await Expense.find().lean();
        const purchases = await PurchaseValue.find().lean();
        const sales = await SaleValue.find().lean();
        // 1. Basic Stats
        const totalProjectValue = projects
            .filter(p => p.status === 'Active')
            .reduce((acc, curr) => acc + (curr.contractAmount || 0), 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalPurchases = purchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const totalPurchaseVAT = purchases.reduce((acc, curr) => acc + (curr.vat || 0), 0);
        const totalPurchaseNet = purchases.reduce((acc, curr) => acc + (curr.amountWithoutVAT || 0), 0);
        const totalSalesVAT = sales.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);
        const totalSalesNet = sales.reduce((acc, curr) => acc + (curr.totalAmountExclVAT || 0), 0);
        let totalSales = totalSalesNet + totalSalesVAT;

        // 2. Data for Budget Distribution (Top 5 Projects)
        const budgetLabels = projects.slice(0, 5).map(p => p.projectName);
        const budgetValues = projects.slice(0, 5).map(p => p.contractAmount || 0);

        // 3. Data for Monthly Spending (Line Chart)
        const monthlySpentMap = {};

        const sortedExpenses = expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedExpenses.forEach(exp => {
            if (exp.date) {
                const dateObj = new Date(exp.date);
                const monthYear = dateObj.toLocaleString('default', { month: 'short', year: '2-digit' });
                monthlySpentMap[monthYear] = (monthlySpentMap[monthYear] || 0) + (exp.amount || 0);
            }
        });

        const expenseLabels = Object.keys(monthlySpentMap).slice(-6);
        const expenseValues = expenseLabels.map(label => monthlySpentMap[label]);

        res.render('dashboard', {
            title: 'Dashboard | SmartBuild',
            totalProjectValue: totalProjectValue.toLocaleString(),
            totalExpenses: totalExpenses.toLocaleString(),
            totalPurchases: totalPurchases.toLocaleString(),
            totalPurchaseVAT: totalPurchaseVAT.toLocaleString(),
            totalPurchaseNet: totalPurchaseNet.toLocaleString(),
            totalSales: totalSales.toLocaleString(),
            totalSalesVAT: totalSalesVAT.toLocaleString(),
            totalSalesNet: totalSalesNet.toLocaleString(),
            projectCount: projects.length,
            chartData: JSON.stringify({
                budgetLabels,
                budgetValues,
                expenseLabels,
                expenseValues
            })
        });
    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).render("500", {
            layout: false,
            message: "Dashboard Loading Error. something went wrong to our ends"
        });
    }
};

// 2. Project List with Enhanced Filtering
exports.getProjects = async (req, res) => {
    try {
        const { search, status, projectId } = req.query;
        let query = {};

        // Build Filter Query
        if (projectId) {
            query._id = projectId; // Direct selection from dropdown
        } else {
            if (search) query.projectName = { $regex: search, $options: 'i' };
            if (status) query.status = status;
        }

        // Get list of ALL projects for the dropdown selector (unfiltered)
        const allProjectNames = await Project.find({}, 'projectName').sort({ projectName: 1 }).lean();

        const projectsRaw = await Project.find(query).sort({ createdAt: -1 }).lean();

        let companyTotalContract = 0;
        let companyTotalSpent = 0;

        const projects = await Promise.all(projectsRaw.map(async (project) => {
            const expenses = await Expense.find({ projectId: project._id }).lean();
            const totalSpent = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const remainingBalance = (project.contractAmount || 0) - totalSpent;

            const percentUsed = project.contractAmount > 0
                ? Math.min(Math.round((totalSpent / project.contractAmount) * 100), 100)
                : 0;

            companyTotalContract += (project.contractAmount || 0);
            companyTotalSpent += totalSpent;

            return {
                ...project,
                totalSpent,
                remainingBalance,
                percentUsed,
                isOverBudget: totalSpent > project.contractAmount,
                statusColor: totalSpent > project.contractAmount ? 'danger' : (percentUsed > 85 ? 'warning' : 'success')
            };
        }));

        res.render('projects', {
            projects,
            allProjectNames,
            searchQuery: search,
            selectedStatus: status,
            selectedProjectId: projectId,
            companyTotals: {
                contract: companyTotalContract,
                spent: companyTotalSpent,
                balance: companyTotalContract - companyTotalSpent,
                healthColor: (companyTotalContract - companyTotalSpent) < 0 ? 'danger' : 'info'
            }
        });
    } catch (err) {
        console.error("Error loading projects:", err);
        res.status(500).render("500", {
            layout: false,
            message: "Error loading projects. something went wrong to our ends"
        });
    }
};

// 3. Save New Project
exports.createProject = async (req, res) => {
    try {
        const { projectName, clientName, contractAmount, status, description, startDate, deadline } = req.body;
        const newProject = await Project.create({
            projectName, clientName, contractAmount,
            status: status || 'Active',
            description, startDate, deadline,
            createdBy: req.user._id
        });
        await logAction(req.user._id, 'CREATE', 'PROJECTS', newProject._id, `Created project "${projectName}"`);
        res.redirect('/projects');
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: "Creating a  project error. something went wrong to our ends"
        });
    }
};

// 4. Update Project
exports.updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await logAction(req.user._id, 'UPDATE', 'PROJECTS', project._id, `Updated project "${project.projectName}"`);
        res.redirect('/projects');
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: "Error while updating project. something went wrong to our ends"
        });
    }
};

// 5. Delete Project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (project) {
            await Project.findByIdAndDelete(req.params.id);
            await logAction(req.user._id, 'DELETE', 'PROJECTS', req.params.id, `Deleted project: "${project.projectName}"`);
        }
        res.redirect('/projects');
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: "Error Deleting Project. something went wrong to our ends"
        });
    }
};