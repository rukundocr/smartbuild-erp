const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // This uses the folder you created in step 3
const purchaseController = require('../controllers/purchaseController');
const { ensureAuthenticated,ensureAdmin } = require('../middleware/auth');

// Main view page
router.get('/',ensureAuthenticated, purchaseController.getPurchases);

// CSV Upload handler
router.post('/import', ensureAuthenticated, ensureAdmin, upload.single('file'), purchaseController.importPurchases);
// ... existing imports
router.get('/export',ensureAuthenticated, purchaseController.exportPurchasesCSV);
// ... existing routes
router.post('/delete-all', ensureAuthenticated, ensureAdmin,  purchaseController.deleteAllPurchases);

module.exports = router;