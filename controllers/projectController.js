const Project = require('../models/Project');
const Expense = require('../models/Expense');
const logAction = require('../utils/logger'); // Import the helper
const InputInvoice = require('../models/InputInvoice');

// 1. Dashboard Logic
exports.getDashboard = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        const expenses = await Expense.find().lean();
        const inputs = await InputInvoice.find().lean();

        const totalProjectValue = projects.reduce((acc, curr) => acc + (curr.contractAmount || 0), 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalPurchases = inputs.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

        res.render('dashboard', {
            title: 'Dashboard | SmartBuild',
            projectCount: projects.length,
            totalProjectValue: totalProjectValue.toLocaleString(),
            totalExpenses: totalExpenses.toLocaleString(),
            totalPurchases: totalPurchases.toLocaleString()
        });
    } catch (err) {
        res.status(500).send("Dashboard Error");
    }
};

// 2. Project List & Create Form
exports.getProjects = async (req, res) => {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    res.render('projects', { projects });
};

// 3. Save Project
exports.createProject = async (req, res) => {
    try {
        const { projectName, clientName, contractAmount, status, description } = req.body;
        await Project.create({
            projectName,
            clientName,
            contractAmount,
            status,
            description,
            createdBy: req.user._id // Links to the logged-in user
        });
        res.redirect('/projects');
    } catch (err) {
        res.status(500).send("Error creating project");
    }
};





exports.createProject = async (req, res) => {
    try {
        const { projectName, clientName, contractAmount, status, description } = req.body;
        
        const newProject = await Project.create({
            projectName,
            clientName,
            contractAmount,
            status,
            description,
            createdBy: req.user._id
        });

        // TRIGGER AUDIT LOG
        await logAction(
            req.user._id, 
            'CREATE', 
            'Project', 
            newProject._id, 
            `Created project: ${projectName}`
        );

        res.redirect('/projects');
    } catch (err) {
        res.status(500).send("Error creating project");
    }
};


// 1. Update Project
exports.updateProject = async (req, res) => {
    try {
        const { projectName, clientName, contractAmount, status, description } = req.body;
        const project = await Project.findByIdAndUpdate(req.params.id, {
            projectName, clientName, contractAmount, status, description
        }, { new: true });

        await logAction(req.user._id, 'UPDATE', 'Project', project._id, `Updated project: ${projectName}`);
        res.redirect('/projects');
    } catch (err) {
        res.status(500).send("Error updating project");
    }
};

// 2. Delete Project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        
        await logAction(req.user._id, 'DELETE', 'Project', req.params.id, `Deleted project: ${project.projectName}`);
        res.redirect('/projects');
    } catch (err) {
        res.status(500).send("Error deleting project");
    }
};