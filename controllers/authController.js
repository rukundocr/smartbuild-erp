const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.getLogin = (req, res) => {
    res.render('login', { 
        layout: 'auth', // This looks for views/layouts/auth.hbs
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
        await User.create({ name, email, password: hashedPassword, role });
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/register');
    }
};


// Example using Passport.js or manual check
exports.postLogin = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login',
        failureFlash: true // This sends the "Incorrect Password" message
    })(req, res, next);
};



exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/auth/login');
    });
};



exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // 1. Check if passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/auth/change-password');
        }

        // 2. Verify current password
        const user = await User.findById(req.user._id);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/auth/change-password');
        }

        // 3. Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // 4. Log the security action
        await logAction(
            req.user._id, 
            'SECURITY_UPDATE', 
            'User', 
            user._id, 
            'User changed their account password'
        );

        req.flash('success_msg', 'Password updated successfully. Please log in again.');
        res.redirect('/users/login');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};