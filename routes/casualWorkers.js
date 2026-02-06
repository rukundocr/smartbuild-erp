const express = require('express');
const router = express.Router();
const casualController = require('../controllers/casualWorkerController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// --- WORKER MANAGEMENT ---

// Display Worker List & Registration Form
router.get('/', ensureAuthenticated, casualController.getWorkers);

// Register New Worker
router.post('/register', ensureAuthenticated, casualController.registerWorker);

// Update Worker Details (For the Edit Worker Modal)
router.post('/update/:id', ensureAuthenticated, ensureAdmin, casualController.updateWorker);


// --- PAYMENT MANAGEMENT ---

// Record a new payment (with 15% WHT logic)
router.post('/pay', ensureAuthenticated, casualController.processPayment);

// View All Payment History
router.get('/payments', ensureAuthenticated, casualController.getPaymentHistory);

// EDIT & DELETE PAYMENTS
// Fetches JSON data for the Edit Modal
router.get('/payment/edit/:id', ensureAuthenticated, ensureAdmin, casualController.getEditPayment);

// Processes the payment update
router.post('/payment/update/:id', ensureAuthenticated, ensureAdmin, casualController.updatePayment);

// Deletes a payment record
router.post('/payment/delete/:id', ensureAuthenticated, ensureAdmin, casualController.deletePayment);

module.exports = router;