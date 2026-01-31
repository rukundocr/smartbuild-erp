const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
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

// Updated postLogin to capture the Audit Log
exports.postLogin = (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            return res.redirect('/auth/login');
        }
        
        req.logIn(user, async (err) => {
            if (err) return next(err);

            // LOGGING: Successful Login
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

        // LOGGING: Security Update
        await logAction(
            req.user._id, 
            'UPDATE', 
            'AUTH', 
            user._id, 
            `User ${user.name} changed their account password`
        );

        req.flash('success_msg', 'Password updated successfully. Please log in again.');
        res.redirect('/auth/login'); // Fixed redirect path to match auth routes
    } catch (err) {
        console.error(err);
        res.status(500).render("500",{
        layout: false,
        message: 'ServerError  . Something went wrong on our end.' 
        });
    }
};