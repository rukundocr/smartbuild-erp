const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // This uses the folder you created in step 3
const purchaseController = require('../controllers/purchaseController');

// Main view page
router.get('/', purchaseController.getPurchases);

// CSV Upload handler
router.post('/import', upload.single('file'), purchaseController.importPurchases);
// ... existing imports
router.get('/export', purchaseController.exportPurchasesCSV);
// ... existing routes
router.post('/delete-all', purchaseController.deleteAllPurchases);

module.exports = router;