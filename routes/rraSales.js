const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const rraController = require('../controllers/rraSaleController');
const { ensureAuthenticated,ensureAdmin } = require('../middleware/auth');

// Main Page (with filters & pagination)
router.get('/', ensureAuthenticated, rraController.getSalesPage);

// CSV Operations
router.post('/import', ensureAuthenticated,ensureAdmin, upload.single('rraCsv'), rraController.importCSVSales);
router.get('/export', ensureAuthenticated, rraController.exportSalesCSV);

// Project Linking
router.post('/link/:id', ensureAuthenticated, rraController.linkProject);

// Bulk Actions
router.post('/delete-all', ensureAuthenticated, ensureAdmin, rraController.deleteAllSales);

module.exports = router;