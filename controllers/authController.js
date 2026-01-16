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

exports.postLogin = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login'
    })(req, res, next);
};

exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/auth/login');
    });
};