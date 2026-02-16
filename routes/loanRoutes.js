const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth'); // Check this path!

// If loanController.getLoans is undefined, this line throws your error
router.get('/', ensureAuthenticated, loanController.getLoans);
router.get('/history/:id', ensureAuthenticated, loanController.getLoanHistory);
router.post('/create', ensureAuthenticated, loanController.createLoan);
router.post('/payment/:id', ensureAuthenticated, loanController.addPayment);
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, loanController.deleteLoan);
router.get('/export-pdf', ensureAuthenticated, loanController.exportLoansPDF);
router.post('/update/:id', ensureAuthenticated, ensureAdmin, loanController.updateLoan);

module.exports = router;