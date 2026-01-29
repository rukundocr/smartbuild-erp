module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/auth/login');
    },
    ensureAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user.role === 'admin') return next();
        res.status(404).render('403',{
            layout:false,
            message:"You must be an Admin to Perform the Desired Action.Contact Admin :)"
        });
    }
};