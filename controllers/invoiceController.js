const Invoice = require('../models/Invoice');
const { generateInvoicePDF } = require('../utils/invoicePdfGenerator');
const Project = require('../models/Project');
const { logAction } = require('../utils/logger'); // Import the logger

// 1. Get All
exports.getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find()
            .populate('projectId') 
            .sort({ createdAt: -1 })
            .lean();
        res.render('invoices/list', { invoices });
    } catch (err) {
        res.status(500).send("Error loading invoices");
    }
};

// 2. Create Invoice with Sequential Numbering
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

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `INV-${year}/${month}/`;

        const lastInvoice = await Invoice.findOne({ 
            invoiceNumber: new RegExp(`^${prefix}`) 
        }).sort({ createdAt: -1 });

        let sequence = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoiceNumber.split('/');
            const lastNum = parseInt(parts[parts.length - 1]);
            sequence = lastNum + 1;
        }

        const formattedSequence = String(sequence).padStart(3, '0');
        const formattedInvoiceNumber = `${prefix}${formattedSequence}`;

        const vat = subtotal * 0.18;
        const grandTotal = subtotal + vat;

        const newInvoice = await Invoice.create({
            invoiceNumber: formattedInvoiceNumber,
            projectId,
            clientName,
            siteLocation,
            items: processedItems,
            subtotal,
            vatAmount: vat,
            grandTotal: grandTotal
        });

        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'CREATE',
            'INVOICES',
            newInvoice._id,
            `Generated Invoice ${formattedInvoiceNumber} for ${clientName}. Total: ${grandTotal.toLocaleString()} RWF.`
        );

        res.redirect('/invoices');
    } catch (err) {
        console.error("Invoice Error:", err);
        res.status(500).render("500",{
        layout: false,
        message: 'Error while creating invoice . Something went wrong on our end.' 
        });
    }
};

// 3. Update Invoice
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
        const grandTotal = subtotal + vat;

        const updatedInvoice = await Invoice.findByIdAndUpdate(req.params.id, {
            clientName, 
            siteLocation, 
            items: processedItems,
            subtotal, 
            vatAmount: vat, 
            grandTotal: grandTotal
        }, { new: true });

        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'UPDATE',
            'INVOICES',
            req.params.id,
            `Modified Invoice ${updatedInvoice.invoiceNumber}. New Total: ${grandTotal.toLocaleString()} RWF.`
        );

        res.redirect('/invoices');
    } catch (err) { 
     
        res.status(500).render("500",{
        layout: false,
        message: 'Updating error. Something went wrong on our end.' 
        });
    }
};

// 4. Download PDF
exports.downloadInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('projectId') 
            .lean();

        if (!invoice) return res.status(404).send("Invoice not found");

        // Optional: Log when an invoice is downloaded
        await logAction(
            req.user._id,
            'EXPORT',
            'INVOICES',
            invoice._id,
            `Downloaded PDF for Invoice ${invoice.invoiceNumber}`
        );

        const pdfBuffer = generateInvoicePDF(invoice);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) { 
        
         res.status(500).render("500",{
        layout: false,
        message: 'Error Generating pdf . Something went wrong on our end.' 
        });
    }
};

// 5. Delete Invoice
exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (invoice) {
            const invNum = invoice.invoiceNumber;
            const amount = invoice.grandTotal;

            await Invoice.findByIdAndDelete(req.params.id);

            // SOLID AUDIT LOG
            await logAction(
                req.user._id,
                'DELETE',
                'INVOICES',
                req.params.id,
                `Deleted Invoice ${invNum} (Value: ${amount.toLocaleString()} RWF)`
            );
        }
        res.redirect('/invoices');
    } catch (err) { 
         res.status(500).render("500",{
        layout: false,
        message: 'Error occured while deleting invoices. Something went wrong on our end.' 
        });
    }
};

// 6. Form Handlers
exports.getInvoiceForm = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        res.render('invoices/new', { projects });
    } catch (err) {
        res.status(500).render("500",{
        layout: false,
        message: 'Error loading form  . Something went wrong on our end.' 
        });
    }
};

exports.getEditInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).lean();
        const projects = await Project.find().lean();
        res.render('invoices/edit', { invoice, projects });
    } catch (err) {
    
        res.status(500).render("500",{
        layout: false,
        message: 'error loading edit form . Something went wrong on our end.' 
        });
    }
};