const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// Main Internal Management Portal (Redirect to the first tab: Inventory)
router.get('/', ensureAuthenticated, (req, res) => {
    res.redirect('/internal/inventory');
});

module.exports = router;
