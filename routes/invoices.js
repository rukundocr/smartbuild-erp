const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// List all
router.get('/', ensureAuthenticated, invoiceController.getAllInvoices);

// Create
router.get('/new', ensureAuthenticated, invoiceController.getInvoiceForm);
router.post('/create', ensureAuthenticated,ensureAdmin, invoiceController.createInvoice);

// Edit
router.get('/edit/:id', ensureAuthenticated, ensureAdmin, invoiceController.getEditInvoice);
router.post('/update/:id', ensureAuthenticated, ensureAdmin, invoiceController.updateInvoice);

// PDF & Delete
router.get('/pdf/:id', ensureAuthenticated, invoiceController.downloadInvoicePDF);
router.post('/delete/:id', ensureAuthenticated,ensureAdmin, invoiceController.deleteInvoice);

module.exports = router;