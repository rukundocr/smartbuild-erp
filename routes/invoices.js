const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { ensureAuthenticated } = require('../middleware/auth');

// List all
router.get('/', ensureAuthenticated, invoiceController.getAllInvoices);

// Create
router.get('/new', ensureAuthenticated, invoiceController.getInvoiceForm);
router.post('/create', ensureAuthenticated, invoiceController.createInvoice);

// Edit
router.get('/edit/:id', ensureAuthenticated, invoiceController.getEditInvoice);
router.post('/update/:id', ensureAuthenticated, invoiceController.updateInvoice);

// PDF & Delete
router.get('/pdf/:id', ensureAuthenticated, invoiceController.downloadInvoicePDF);
router.post('/delete/:id', ensureAuthenticated, invoiceController.deleteInvoice);

module.exports = router;