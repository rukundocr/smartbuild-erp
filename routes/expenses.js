const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// 1. Static/Fixed routes first
router.get('/expenses', ensureAuthenticated, expenseController.getExpenses);
router.get('/expenses/download', ensureAuthenticated, expenseController.downloadPDF); // MUST BE HERE

// 2. Dynamic parameter routes last
router.post('/expenses', ensureAuthenticated, ensureAdmin, expenseController.createExpense);
router.post('/expenses/update/:id', ensureAuthenticated, ensureAdmin, expenseController.updateExpense);
router.post('/expenses/delete/:id', ensureAuthenticated,ensureAdmin, expenseController.deleteExpense);
router.post('/link/:id', ensureAuthenticated,ensureAdmin, expenseController.linkProject);

module.exports = router;