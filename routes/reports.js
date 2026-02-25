const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/vat-summary', ensureAuthenticated, reportController.getVATSummary);
router.get('/api/stats/vat-trend', ensureAuthenticated, reportController.getVatTrend);

module.exports = router;