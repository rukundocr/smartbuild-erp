const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAuthenticated, clientController.getClients);
router.post('/add', ensureAuthenticated, clientController.addClient);
router.post('/update/:id', ensureAuthenticated, clientController.updateClient);
router.get('/delete/:id', ensureAuthenticated, ensureAdmin, clientController.deleteClient);

module.exports = router;
