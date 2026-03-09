const express = require('express');
const router = express.Router();
const internalSalesController = require('../controllers/internalSalesController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/create', ensureAuthenticated, internalSalesController.getCreateInvoice);
router.post('/create', ensureAuthenticated, internalSalesController.createInvoice);
router.get('/summary', ensureAuthenticated, internalSalesController.getSalesSummary);
router.get('/receipt/:id', ensureAuthenticated, internalSalesController.getReceipt);
router.get('/download-pdf/:id', ensureAuthenticated, internalSalesController.downloadPDF);
router.get('/edit/:id', ensureAuthenticated, internalSalesController.getEditInvoice);
router.post('/edit/:id', ensureAuthenticated, internalSalesController.updateInvoice);
router.get('/delete/:id', ensureAuthenticated, ensureAdmin, internalSalesController.deleteInvoice);
router.get('/download-summary', ensureAuthenticated, internalSalesController.downloadSummaryPDF);
router.post('/update-status/:id', ensureAuthenticated, ensureAdmin, internalSalesController.updateStatus);

module.exports = router;
