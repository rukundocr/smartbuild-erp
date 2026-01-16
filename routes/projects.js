const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { ensureAuthenticated } = require('../middleware/auth');

// Dashboard (Root)
router.get('/', ensureAuthenticated, projectController.getDashboard);

// Project Management
router.get('/projects', ensureAuthenticated, projectController.getProjects);
router.post('/projects', ensureAuthenticated, projectController.createProject);
// ... existing routes
router.post('/projects/update/:id', ensureAuthenticated, projectController.updateProject);
router.post('/projects/delete/:id', ensureAuthenticated, projectController.deleteProject);

module.exports = router;