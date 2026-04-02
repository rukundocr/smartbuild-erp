const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAuthenticated, supplierController.getSuppliers);
router.post('/create', ensureAuthenticated, ensureAdmin, supplierController.createSupplier);
router.get('/edit/:id', ensureAuthenticated, ensureAdmin, supplierController.getEditSupplier);
router.post('/edit/:id', ensureAuthenticated, ensureAdmin, supplierController.updateSupplier);
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, supplierController.deleteSupplier);

module.exports = router;
