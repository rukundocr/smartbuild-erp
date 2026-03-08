const express = require('express');
const router = express.Router();
const internalSalesController = require('../controllers/internalSalesController');

router.get('/create', internalSalesController.getCreateInvoice);
router.post('/create', internalSalesController.createInvoice);
router.get('/summary', internalSalesController.getSalesSummary);
router.get('/receipt/:id', internalSalesController.getReceipt);
router.get('/download-pdf/:id', internalSalesController.downloadPDF);
router.get('/edit/:id', internalSalesController.getEditInvoice);
router.post('/edit/:id', internalSalesController.updateInvoice);
router.get('/delete/:id', internalSalesController.deleteInvoice);
router.get('/download-summary', internalSalesController.downloadSummaryPDF);
router.post('/update-status/:id', internalSalesController.updateStatus);

module.exports = router;
