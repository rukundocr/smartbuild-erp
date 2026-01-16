const Invoice = require('../models/Invoice');
const { generateInvoicePDF } = require('../utils/invoicePdfGenerator');
const Project = require('../models/Project'); // Import Project model

// 1. Get All
exports.getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find()
            .populate('projectId') // Link the project data
            .sort({ createdAt: -1 })
            .lean();
        res.render('invoices/list', { invoices });
    } catch (err) {
        res.status(500).send("Error loading invoices");
    }
};

// 2. Get Create Form
exports.getInvoiceForm = (req, res) => {
    res.render('invoices/new');
};

// 3. Create Invoice
exports.createInvoice = async (req, res) => {
    try {
        const { projectId, clientName, siteLocation, items } = req.body;
        const itemsArray = Array.isArray(items) ? items : Object.values(items || {});
        
        let subtotal = 0;
        const processedItems = itemsArray.map(item => {
            const total = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
            subtotal += total;
            return { ...item, totalPrice: total };
        });

        const vat = subtotal * 0.18;
        const newInvoice = new Invoice({
            invoiceNumber: 'INV-' + Math.floor(100000 + Math.random() * 900000),
            projectId,
            clientName,
            siteLocation,
            items: processedItems,
            subtotal,
            vatAmount: vat,
            grandTotal: subtotal + vat
        });

        await newInvoice.save();
        res.redirect('/invoices');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Get Edit Form (Matches router.get('/edit/:id'))
exports.getEditInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        res.render('invoices/edit', { invoice });
    } catch (err) { res.status(500).send("Error"); }
};

// 5. Update Invoice (Matches router.post('/update/:id'))
exports.updateInvoice = async (req, res) => {
    try {
        const { clientName, siteLocation, items } = req.body;
        const itemsArray = Array.isArray(items) ? items : Object.values(items || {});
        let subtotal = 0;
        const processedItems = itemsArray.map(item => {
            const total = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
            subtotal += total;
            return { ...item, totalPrice: total };
        });
        const vat = subtotal * 0.18;
        await Invoice.findByIdAndUpdate(req.params.id, {
            clientName, siteLocation, items: processedItems,
            subtotal, vatAmount: vat, grandTotal: subtotal + vat
        });
        res.redirect('/invoices');
    } catch (err) { res.status(500).send(err.message); }
};

// 6. Download PDF (Matches router.get('/pdf/:id'))
exports.downloadInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        const pdfBuffer = generateInvoicePDF(invoice);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) { res.status(500).send("Error generating PDF"); }
};

// 7. Delete
exports.deleteInvoice = async (req, res) => {
    try {
        await Invoice.findByIdAndDelete(req.params.id);
        res.redirect('/invoices');
    } catch (err) { res.status(500).send("Error"); }
};



// Update getInvoiceForm
exports.getInvoiceForm = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        res.render('invoices/new', { projects });
    } catch (err) {
        res.status(500).send("Error loading form");
    }
};

// Update getEditInvoice
exports.getEditInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        const projects = await Project.find().lean();
        res.render('invoices/edit', { invoice, projects });
    } catch (err) {
        res.status(500).send("Error loading edit form");
    }
};