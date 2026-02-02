const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticator } = require('@otplib/preset-default');
const QRCode = require('qrcode');
const { logAction } = require('../utils/logger'); // Import the logger

exports.getLogin = (req, res) => {
    res.render('login', { 
        layout: 'auth', 
        title: 'Login | SmartBuild' 
    });
};

exports.getRegister = (req, res) => {
    res.render('register', { 
        layout: 'auth', 
        title: 'Register | SmartBuild' 
    });
};

exports.postRegister = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name, email, password: hashedPassword, role });

        // LOGGING: User Registration (Note: req.user won't exist yet, so we use newUser._id)
        await logAction(newUser._id, 'CREATE', 'AUTH', newUser._id, `New user registered: ${name} (${role})`);

        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/register');
    }
};

exports.postLogin = (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) return next(err);
        
        // If login fails (user not found or password incorrect)
        if (!user) {
            // 'info' contains the message from your Passport Strategy
            req.flash('error_msg', info.message || 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Check if 2FA is enabled for this user
        if (user.isTwoFactorEnabled) {
            req.session.tempUserId = user._id; 
            return res.redirect('/auth/login-2fa');
        }

        // If 2FA is NOT enabled, proceed with normal login
        req.logIn(user, async (err) => {
            if (err) return next(err);

            await logAction(user._id, 'LOGIN', 'AUTH', user._id, `User logged in: ${user.name}`);
            return res.redirect('/');
        });
    })(req, res, next);
};





exports.logout = (req, res, next) => {
    const userId = req.user ? req.user._id : null;
    const userName = req.user ? req.user.name : 'Unknown';

    req.logout(async (err) => {
        if (err) return next(err);
        
        // LOGGING: Logout
        if (userId) {
            await logAction(userId, 'LOGOUT', 'AUTH', userId, `User logged out: ${userName}`);
        }

        res.redirect('/auth/login');
    });
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/auth/change-password');
        }

        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/auth/change-password');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        await logAction(req.user._id, 'UPDATE', 'AUTH', user._id, `User ${user.name} changed their account password`);

        // Log the user out since the password has changed (Security Best Practice)
        req.logout((err) => {
            if (err) return next(err);
            
            // Render the page with the success state
            res.render('change-password', {
                title: 'Password Updated | SmartBuild',
                passwordChanged: true, // This flag triggers the success UI
                layout: 'auth' // Using auth layout because user is now logged out
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).render("500", { layout: false, message: 'Server Error' });
    }
};

exports.getChangePassword = (req, res) => {
    res.render('change-password', { 
        title: 'Change Password | SmartBuild',
        user: req.user // Pass user to the layout
    });
};

// Step 1: Generate the QR Code for the user to scan
exports.setup2FA = async (req, res) => {
    try {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(req.user.email, 'SmartBuild-ERP', secret);
        
        // Save temporary secret to user (not enabled yet)
        await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });

        const qrImageUrl = await QRCode.toDataURL(otpauth);
        res.render('setup-2fa', { qrImageUrl, secret, title: 'Setup 2FA' });
    } catch (err) {
        res.status(500).send("Error setting up 2FA");
    }
};

// Step 2: Verify the code and enable 2FA
exports.verify2FA = async (req, res) => {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    const isValid = authenticator.check(token, user.twoFactorSecret);

    if (isValid) {
        user.isTwoFactorEnabled = true;
        await user.save();
        req.flash('success_msg', '2FA enabled successfully!');
        res.redirect('/');
    } else {
        req.flash('error_msg', 'Invalid code. Try again.');
        res.redirect('/auth/setup-2fa');
    }
};

exports.postVerifyLogin2FA = async (req, res, next) => {
    try {
        const { token } = req.body;
        const userId = req.session.tempUserId;

        if (!userId) return res.redirect('/auth/login');

        const user = await User.findById(userId);
        
        // Verify the 6-digit token against the stored secret
        const isValid = authenticator.check(token, user.twoFactorSecret);

        if (isValid) {
            // Token is correct! Now officially log the user in via Passport
            req.logIn(user, async (err) => {
                if (err) return next(err);

                // Clear temporary session data
                delete req.session.tempUserId;

                // LOGGING: Successful Login (via 2FA)
                await logAction(user._id, 'LOGIN', 'AUTH', user._id, `User logged in via 2FA: ${user.name}`);
                
                return res.redirect('/');
            });
        } else {
            req.flash('error_msg', 'Invalid 2FA code. Please try again.');
            res.redirect('/auth/login-2fa');
        }
    } catch (err) {
        console.error(err);
        res.redirect('/auth/login');
    }
};


// 1. Render Settings Page
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('settings', { 
            title: 'Security Settings', 
            user,
            is2FAEnabled: user.isTwoFactorEnabled 
        });
    } catch (err) {
        res.redirect('/');
    }
};

// 2. Start 2FA Setup (Generate QR)
exports.initiate2FA = async (req, res) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'SmartBuild-ERP', secret);
    
    // Save temporary secret (don't enable yet)
    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });

    const qrImageUrl = await QRCode.toDataURL(otpauth);
    res.json({ qrImageUrl, secret }); // Send to frontend for a modal or specific view
};

// 3. Confirm and Turn ON 2FA
exports.verifyAndEnable2FA = async (req, res) => {
    const { token } = req.body;
    const user = await User.findById(req.user._id);
    const isValid = authenticator.check(token, user.twoFactorSecret);

    if (isValid) {
        user.isTwoFactorEnabled = true;
        await user.save();
        await logAction(user._id, 'UPDATE', 'AUTH', user._id, "Enabled Two-Factor Authentication");
        req.flash('success_msg', '2FA is now active on your account.');
    } else {
        req.flash('error_msg', 'Invalid code. Activation failed.');
    }
    res.redirect('/auth/settings');
};

// 4. Turn OFF 2FA
exports.disable2FA = async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { 
        isTwoFactorEnabled: false, 
        twoFactorSecret: null 
    });
    await logAction(req.user._id, 'UPDATE', 'AUTH', req.user._id, "Disabled Two-Factor Authentication");
    req.flash('success_msg', 'Two-Factor Authentication has been disabled.');
    res.redirect('/auth/settings');
};