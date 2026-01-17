const Project = require('../models/Project');
const Expense = require('../models/Expense');
const { logAction } = require('../utils/logger'); // Destructured import fix
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
        console.error("Dashboard Error:", err);
        res.status(500).send("Dashboard Error");
    }
};

// 2. Project List
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }).lean();
        res.render('projects', { projects });
    } catch (err) {
        res.status(500).send("Error loading projects");
    }
};

// 3. Save New Project
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

        // Audit Log
        await logAction(
            req.user._id, 
            'CREATE', 
            'Project', 
            newProject._id, 
            `Created project: ${projectName} for ${clientName}`
        );

        res.redirect('/projects');
    } catch (err) {
        console.error("Create Error:", err);
        res.status(500).send("Error creating project");
    }
};

// 4. Update Project
exports.updateProject = async (req, res) => {
    try {
        const { projectName, clientName, contractAmount, status, description } = req.body;
        
        const project = await Project.findByIdAndUpdate(req.params.id, {
            projectName, 
            clientName, 
            contractAmount, 
            status, 
            description
        }, { new: true });

        if (!project) return res.status(404).send("Project not found");

        // Audit Log
        await logAction(
            req.user._id, 
            'UPDATE', 
            'Project', 
            project._id, 
            `Updated project: ${projectName} (Status: ${status})`
        );
        
        res.redirect('/projects');
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).send("Error updating project");
    }
};

// 5. Delete Project
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        
        if (project) {
            await logAction(
                req.user._id, 
                'DELETE', 
                'Project', 
                req.params.id, 
                `Deleted project: ${project.projectName}`
            );
        }
        
        res.redirect('/projects');
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send("Error deleting project");
    }
};