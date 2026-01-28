const Project = require('../models/Project');
const Expense = require('../models/Expense');
const { logAction } = require('../utils/logger');
const PurchaseValue = require('../models/Purchase');

// 1. Dashboard Logic
exports.getDashboard = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        const expenses = await Expense.find().lean();
        const purchases = await PurchaseValue.find().lean();

        const totalProjectValue = projects.reduce((acc, curr) => acc + (curr.contractAmount || 0), 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
        const totalPurchases = purchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const totalPurchaseVAT = purchases.reduce((acc, curr) => acc + (curr.vat || 0), 0);
        const totalPurchaseNet = purchases.reduce((acc, curr) => acc + (curr.amountWithoutVAT || 0), 0);

        res.render('dashboard', {
            title: 'Dashboard | SmartBuild',
            projectCount: projects.length,
            totalProjectValue: totalProjectValue.toLocaleString(),
            totalExpenses: totalExpenses.toLocaleString(),
            totalPurchases: totalPurchases.toLocaleString(),
            totalPurchaseVAT: totalPurchaseVAT.toLocaleString(),
            totalPurchaseNet: totalPurchaseNet.toLocaleString()
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

        // SOLID AUDIT LOG
        await logAction(
            req.user._id, 
            'CREATE', 
            'PROJECTS', 
            newProject._id, 
            `Created new project "${projectName}" for client "${clientName}" with contract value of ${contractAmount} RWF.`
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
        
        // Fetch old data for comparison in log if needed
        const oldProject = await Project.findById(req.params.id);
        
        const project = await Project.findByIdAndUpdate(req.params.id, {
            projectName, 
            clientName, 
            contractAmount, 
            status, 
            description
        }, { new: true });

        if (!project) return res.status(404).send("Project not found");

        // SOLID AUDIT LOG
        await logAction(
            req.user._id, 
            'UPDATE', 
            'PROJECTS', 
            project._id, 
            `Updated project "${projectName}". Status changed from ${oldProject.status} to ${status}. Amount: ${contractAmount} RWF.`
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
        const project = await Project.findById(req.params.id);
        
        if (project) {
            const pName = project.projectName;
            await Project.findByIdAndDelete(req.params.id);

            // SOLID AUDIT LOG
            await logAction(
                req.user._id, 
                'DELETE', 
                'PROJECTS', 
                req.params.id, 
                `Deleted project: "${pName}" and all associated metadata.`
            );
        }
        
        res.redirect('/projects');
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).send("Error deleting project");
    }
};