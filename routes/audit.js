const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// Main view for the logs
router.get('/', auditController.getLogs);
router.post('/clear', auditController.clearLogs);

module.exports = router;