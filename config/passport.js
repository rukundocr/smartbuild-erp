const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function(passport) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            // Match User
            const user = await User.findOne({ email });
            
            if (!user) {
                // This message is what 'info.message' catches in the controller
                return done(null, false, { message: 'This email is not registered' });
            }

            // Match Password
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect password. Please try again.' });
            }
        } catch (err) {
            return done(err);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};