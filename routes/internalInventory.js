const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAuthenticated, inventoryController.getInventory);
router.post('/add', ensureAuthenticated, inventoryController.addInventory);
router.post('/update/:id', ensureAuthenticated, inventoryController.updateInventory);
router.get('/delete/:id', ensureAuthenticated, ensureAdmin, inventoryController.deleteInventory);
router.get('/next-sku/:category', ensureAuthenticated, inventoryController.getNextSKU);
router.get('/download-pdf', ensureAuthenticated, inventoryController.downloadInventoryPDF);

module.exports = router;
