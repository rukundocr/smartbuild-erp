const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { ensureAuthenticated } = require('../middleware/auth');

// Main view for the logs
router.get('/',  ensureAuthenticated, auditController.getLogs);
router.post('/clear',  ensureAuthenticated, auditController.clearLogs);

module.exports = router;