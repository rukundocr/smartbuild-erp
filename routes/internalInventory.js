const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventory);
router.post('/add', inventoryController.addInventory);
router.post('/update/:id', inventoryController.updateInventory);
router.get('/delete/:id', inventoryController.deleteInventory);
router.get('/next-sku/:category', inventoryController.getNextSKU);

module.exports = router;
