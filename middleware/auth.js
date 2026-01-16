module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/auth/login');
    },
    ensureAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user.role === 'admin') return next();
        res.status(403).send('Unauthorized: Admin Access Required');
    }
};