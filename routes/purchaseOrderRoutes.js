const express = require('express');
const router = express.Router();
const poController = require('../controllers/purchaseOrderController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAuthenticated, poController.getPurchaseOrders);
router.get('/create', ensureAuthenticated, poController.getCreatePO);
router.post('/create', ensureAuthenticated, poController.createPO);
router.get('/edit/:id', ensureAuthenticated, ensureAdmin, poController.getEditPO);
router.post('/update/:id', ensureAuthenticated, ensureAdmin, poController.updatePO);
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, poController.deletePO);
router.get('/receive/:id', ensureAuthenticated, poController.getReceivePO);
router.post('/receive/:id', ensureAuthenticated, poController.confirmDelivery);
router.get('/download-pdf/:id', ensureAuthenticated, poController.downloadPDF);

module.exports = router;
