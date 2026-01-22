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

// 3. Create Invoice with Sequential Numbering
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

        // --- SEQUENTIAL INVOICE NUMBER LOGIC ---
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `INV-${year}/${month}/`;

        // Find the latest invoice that starts with the current year/month prefix
        const lastInvoice = await Invoice.findOne({ 
            invoiceNumber: new RegExp(`^${prefix}`) 
        }).sort({ createdAt: -1 });

        let sequence = 1;
        if (lastInvoice) {
            // Extract the number after the last slash and add 1
            const parts = lastInvoice.invoiceNumber.split('/');
            const lastNum = parseInt(parts[parts.length - 1]);
            sequence = lastNum + 1;
        }

        // Format sequence to be 3 digits (e.g., 001, 002)
        const formattedSequence = String(sequence).padStart(3, '0');
        const formattedInvoiceNumber = `${prefix}${formattedSequence}`;
        // ---------------------------------------

        const vat = subtotal * 0.18;
        const newInvoice = new Invoice({
            invoiceNumber: formattedInvoiceNumber,
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
        console.error("Invoice Error:", err);
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

// ... (keep other functions as they are)

// 6. Download PDF (Updated to include populate)
exports.downloadInvoicePDF = async (req, res) => {
    try {
        // We add .populate('projectId') here so we can access the project name
        const invoice = await Invoice.findById(req.params.id)
            .populate('projectId') 
            .lean();

        if (!invoice) return res.status(404).send("Invoice not found");

        const pdfBuffer = generateInvoicePDF(invoice);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) { 
        console.error(err);
        res.status(500).send("Error generating PDF"); 
    }
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