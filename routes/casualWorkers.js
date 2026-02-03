const express = require('express');
const router = express.Router();
const casualController = require('../controllers/casualWorkerController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Existing routes...
router.get('/', ensureAuthenticated, casualController.getWorkers);
router.post('/pay', ensureAuthenticated, casualController.processPayment);
router.get('/payments', ensureAuthenticated, casualController.getPaymentHistory);

// EDIT & DELETE ROUTES
router.get('/payment/edit/:id', ensureAuthenticated, ensureAdmin, casualController.getEditPayment);
router.post('/payment/update/:id', ensureAuthenticated, ensureAdmin, casualController.updatePayment);
router.post('/payment/delete/:id', ensureAuthenticated, ensureAdmin, casualController.deletePayment);

module.exports = router;