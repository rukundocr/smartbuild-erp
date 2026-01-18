const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const rraController = require('../controllers/rraSaleController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, rraController.getSalesPage);
router.post('/import', ensureAuthenticated, upload.single('rraCsv'), rraController.importCSVSales);
router.post('/link/:id', ensureAuthenticated, rraController.linkProject);

module.exports = router;