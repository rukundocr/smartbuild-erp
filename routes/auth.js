const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated, ensureAdmin} = require('../middleware/auth');

router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

router.get('/register', ensureAuthenticated, ensureAdmin, authController.getRegister);
router.post('/register',ensureAuthenticated, ensureAdmin, authController.postRegister);

router.get('/logout', authController.logout);

router.get('/change-password', ensureAuthenticated, authController.getChangePassword);
router.post('/update-password', ensureAuthenticated, authController.updatePassword);

// Add these to routes/auth.js
router.get('/login-2fa', (req, res) => res.render('login-2fa', { layout: 'auth', title: '2FA Verification' }));
router.post('/login-2fa', authController.postVerifyLogin2FA);

// GET the 2FA entry page (The screen with the 6-digit box)
router.get('/login-2fa', (req, res) => {
    // If there is no temporary user ID in session, they shouldn't be here
    if (!req.session.tempUserId) return res.redirect('/auth/login');
    
    res.render('login-2fa', { 
        layout: 'auth', // Ensure you use your auth layout (without the sidebar)
        title: '2FA Verification' 
    });
});

// Settings View
router.get('/settings', ensureAuthenticated, authController.getSettings);

// 2FA Setup Logic
router.post('/initiate-2fa', ensureAuthenticated, authController.initiate2FA);
router.post('/verify-and-enable-2fa', ensureAuthenticated, authController.verifyAndEnable2FA);
router.post('/disable-2fa', ensureAuthenticated, authController.disable2FA);










module.exports = router;