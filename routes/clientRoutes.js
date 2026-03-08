const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/', clientController.getClients);
router.post('/add', clientController.addClient);
router.post('/update/:id', clientController.updateClient);
router.get('/delete/:id', clientController.deleteClient);

module.exports = router;
