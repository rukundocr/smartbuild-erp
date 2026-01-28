require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./config/db');
const path = require('path');
const invoiceRoutes = require('./routes/invoices');
const purchaseRoutes = require('./routes/purchases'); // 1. Add this near other route imports
const auditRoutes = require('./routes/audit');
const reportRoutes = require('./routes/reports');
const loanRoutes = require('./routes/loanRoutes');


const flash = require('connect-flash');
// Initialize App & DB
const app = express();
connectDB();

// Passport Config
require('./config/passport')(passport);



// app.js

// Find this line in your app.js
app.use(express.urlencoded({ extended: true })); // Ensure this is TRUE, not false
app.use(express.json());



app.use(session({
    secret: 'smartbuild_secret',
    resave: true,
    saveUninitialized: true
}));

app.use(flash());

// Global Vars for messages
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg'); // This maps to {{error_msg}} in HBS
    res.locals.error = req.flash('error'); 
    next();
});







// Engine 
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    
    // FIX: This allows Handlebars to access Mongoose properties like "role"
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true,
    },
    
    helpers: {
        gt: (a, b) => a > b,

        // Used for matching IDs in project/user filters
        toString: (val) => val ? val.toString() : '',

        // Added substring helper for user initials (e.g., "John" -> "J")
        substring: function (str, start, len) {
            if (str && typeof str === 'string') {
                return str.substring(start, len);
            }
            return '';
        },

        // Improved equality check
        eq: function (a, b) {
            if (a === undefined || b === undefined || a === null || b === null) return false;
            return a.toString() === b.toString();
        },

        formatCurrency: function (n) {
            if (!n) return '0 RWF';
            return new Intl.NumberFormat('en-RW').format(n) + ' RWF';
        },

        formatDate: function (date) {
            if (!date) return "";
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(date));
        },

        // --- NEW LOAN HELPERS ---

        // Calculates remaining balance: (Total - Paid)
        subtract: function (a, b) {
            const result = (parseFloat(a) || 0) - (parseFloat(b) || 0);
            return new Intl.NumberFormat('en-RW').format(result) + ' RWF';
        },

        // Calculates percentage for progress bars (Paid / Total * 100)
        percentage: function (partial, total) {
            if (!total || total === 0) return 0;
            const p = (parseFloat(partial) / parseFloat(total)) * 100;
            return Math.min(100, p).toFixed(0);
        }
    }
}));


app.set('view engine', 'hbs');

// Middleware
app.use(morgan('dev')); // Console logging
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session & Passport
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Global User variable
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});


// Routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/projects')); // Dashboard at root
// ... under your other routes
app.use('/', require('./routes/expenses'));
app.use('/invoices', invoiceRoutes);

// ... other imports


// ... other middleware
app.use('/purchases', purchaseRoutes); // 2. Add this near your other app.use('/expenses', ...) lines

// 2. Use the route (near app.use('/expenses', ...))
app.use('/audit', auditRoutes);

// ... Your existing routes ...
app.use('/auth', require('./routes/auth'));
app.use('/purchases', require('./routes/purchases'));
app.use('/expenses', require('./routes/expenses'));
app.use('/rra-sales', require('./routes/rraSales'));
app.use('/reports', reportRoutes);
app.use('/loans', loanRoutes);


// --- THE 404 CATCH-ALL MIDDLEWARE ---
// This middleware triggers only if none of the routes above match the URL
app.use((req, res, next) => {
    res.status(404).render('404', { 
        layout: false, // or false if you don't want the sidebar/nav visible
        title: "Page Not Found | SmartBuild"
    });
});

// --- OPTIONAL: GLOBAL ERROR HANDLER (500) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('404', { 
        layout: false,
        message: 'Something went wrong on our end.' 
    });
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));