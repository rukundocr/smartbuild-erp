require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./config/db');
const path = require('path');
const invoiceRoutes = require('./routes/invoices');

// Initialize App & DB
const app = express();
connectDB();

// Passport Config
require('./config/passport')(passport);



// app.js

// Find this line in your app.js
app.use(express.urlencoded({ extended: true })); // Ensure this is TRUE, not false
app.use(express.json());
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
        eq: function (a, b) {
            return a && b && a.toString() === b.toString();
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
                year: 'numeric'
            }).format(new Date(date));
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

// ... rest of app.js ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));