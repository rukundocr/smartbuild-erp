const { InternalInvoice, validateInternalInvoice } = require('../models/InternalInvoice');
const { Inventory } = require('../models/Inventory');
const { Client } = require('../models/Client');
const { generateInternalPDF } = require('../utils/internalInvoicePdf');
const { generateInternalSummaryPDF } = require('../utils/internalSummaryPdf');
const { logAction } = require('../utils/logger');

exports.getCreateInvoice = async (req, res) => {
    try {
        const items = await Inventory.find().sort({ itemName: 1 });
        const clients = await Client.find().sort({ clientName: 1 });
        const invoiceCount = await InternalInvoice.countDocuments();
        res.render('internal-sales/create', {
            title: 'Create Internal Invoice | SmartBuild',
            items,
            clients,
            invoiceCount
        });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales');
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}-${month}-`;

        const lastInvoice = await InternalInvoice.findOne({
            invoiceNo: new RegExp(`^${prefix}`)
        }).sort({ createdAt: -1 });

        let sequence = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoiceNo.split('-');
            const lastNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastNum)) sequence = lastNum + 1;
        }

        req.body.invoiceNo = `${prefix}${String(sequence).padStart(3, '0')}`;

        if (req.body.items && !Array.isArray(req.body.items)) {
            req.body.items = Object.values(req.body.items);
        }

        const { error } = validateInternalInvoice(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect('/internal/sales/create');
        }

        const { items } = req.body;
        const itemIds = items.map(i => i.itemId);
        const hasDuplicates = new Set(itemIds).size !== itemIds.length;
        if (hasDuplicates) {
            req.flash('error_msg', 'Cannot have duplicate items on the same invoice.');
            return res.redirect('/internal/sales/create');
        }

        // Stock Guard
        for (const item of items) {
            const invItem = await Inventory.findById(item.itemId);
            if (!invItem || invItem.quantity < item.qty) {
                req.flash('error_msg', `Insufficient stock for ${invItem ? invItem.itemName : 'unknown item'}`);
                return res.redirect('/internal/sales/create');
            }
        }

        // Save Invoice
        const newInvoice = new InternalInvoice(req.body);
        await newInvoice.save();

        // Decrement Stock
        for (const item of items) {
            await Inventory.findByIdAndUpdate(item.itemId, {
                $inc: { quantity: -item.qty }
            });
        }

        await logAction(req.user._id, 'CREATE', 'INTERNAL_SALES', newInvoice._id, `Created invoice: ${newInvoice.invoiceNo}`);

        req.flash('success_msg', 'Internal Invoice created successfully');
        res.redirect(`/internal/sales/receipt/${newInvoice._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating invoice');
        res.redirect('/internal/sales/create');
    }
};

exports.getSalesSummary = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        let query = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        if (status) query.status = status;

        const invoices = await InternalInvoice.find(query).populate('clientId').populate('items.itemId').sort({ date: -1 });

        let totalRevenue = 0;
        let totalCost = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'Cancelled') {
                totalRevenue += inv.grandTotal;
                inv.items.forEach(item => {
                    totalCost += (item.qty * item.costAtSale);
                });
            }
        });

        const netProfit = totalRevenue - totalCost;

        res.render('internal-sales/summary', {
            title: 'Internal Sales Summary | SmartBuild',
            invoices,
            totalRevenue,
            totalCost,
            netProfit,
            startDate,
            endDate,
            status
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
};

exports.getReceipt = async (req, res) => {
    try {
        const invoice = await InternalInvoice.findById(req.params.id)
            .populate('clientId')
            .populate('items.itemId');

        if (!invoice) {
            req.flash('error_msg', 'Invoice not found');
            return res.redirect('/internal/sales/summary');
        }

        res.render('internal-sales/receipt', {
            layout: false,
            title: `Receipt - ${invoice.invoiceNo}`,
            invoice
        });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales/summary');
    }
};

exports.downloadPDF = async (req, res) => {
    try {
        const invoice = await InternalInvoice.findById(req.params.id)
            .populate('clientId')
            .populate('items.itemId');

        if (!invoice) return res.status(404).send('Invoice not found');

        const format = req.query.format === 'thermal' ? 'thermal' : 'a4';
        const pdfBuffer = await generateInternalPDF(invoice, format);

        await logAction(req.user._id, 'EXPORT', 'INTERNAL_SALES', req.params.id, `Exported invoice PDF: ${invoice.invoiceNo} (${format})`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=Invoice_${invoice.invoiceNo}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
};

exports.getEditInvoice = async (req, res) => {
    try {
        const invoice = await InternalInvoice.findById(req.params.id).populate('items.itemId');
        const items = await Inventory.find();
        const clients = await Client.find().sort({ clientName: 1 });

        if (!invoice) return res.redirect('/internal/sales/summary');

        res.render('internal-sales/edit', {
            title: 'Edit Internal Invoice',
            invoice,
            items,
            clients
        });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales/summary');
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        if (req.body.items && !Array.isArray(req.body.items)) {
            req.body.items = Object.values(req.body.items);
        }

        const { error } = validateInternalInvoice(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect(`/internal/sales/edit/${req.params.id}`);
        }

        const { items } = req.body;
        const itemIds = items.map(i => i.itemId);
        const hasDuplicates = new Set(itemIds).size !== itemIds.length;
        if (hasDuplicates) {
            req.flash('error_msg', 'Cannot have duplicate items on the same invoice.');
            return res.redirect(`/internal/sales/edit/${req.params.id}`);
        }

        const oldInvoice = await InternalInvoice.findById(req.params.id);
        if (!oldInvoice) return res.redirect('/internal/sales/summary');

        req.body.status = req.body.status || oldInvoice.status;

        // Restore stock if it wasn't cancelled
        if (oldInvoice.status !== 'Cancelled') {
            for (const item of oldInvoice.items) {
                await Inventory.findByIdAndUpdate(item.itemId, { $inc: { quantity: item.qty } });
            }
        }

        // If new status is not cancelled, check stock and decrement
        if (req.body.status !== 'Cancelled') {
            for (const item of items) {
                const invItem = await Inventory.findById(item.itemId);
                if (!invItem || invItem.quantity < item.qty) {
                    req.flash('error_msg', `Insufficient stock for ${invItem ? invItem.itemName : 'item'}`);
                    // Restore original stock if failure
                    if (oldInvoice.status !== 'Cancelled') {
                        for (const oldItem of oldInvoice.items) {
                            await Inventory.findByIdAndUpdate(oldItem.itemId, { $inc: { quantity: -oldItem.qty } });
                        }
                    }
                    return res.redirect(`/internal/sales/edit/${req.params.id}`);
                }
            }
            // Apply decrement
            for (const item of items) {
                await Inventory.findByIdAndUpdate(item.itemId, { $inc: { quantity: -item.qty } });
            }
        }

        await InternalInvoice.findByIdAndUpdate(req.params.id, req.body);
        await logAction(req.user._id, 'UPDATE', 'INTERNAL_SALES', req.params.id, `Updated invoice: ${oldInvoice.invoiceNo}`);
        req.flash('success_msg', 'Invoice updated successfully');
        res.redirect('/internal/sales/summary');
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales/summary');
    }
};

exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await InternalInvoice.findById(req.params.id);
        if (!invoice) return res.redirect('/internal/sales/summary');

        // Stock Return Logic on Deletion:
        // Only Pending invoices return stock (they haven't been finalized but stock was reserved).
        // Paid invoices keep stock deducted (user request).
        // Cancelled invoices already returned stock during the status transition.
        if (invoice.status === 'Pending') {
            for (const item of invoice.items) {
                await Inventory.findByIdAndUpdate(item.itemId, { $inc: { quantity: item.qty } });
            }
            req.flash('success_msg', 'Pending invoice deleted and stock returned to store.');
        } else if (invoice.status === 'Paid') {
            req.flash('success_msg', 'Paid invoice deleted. Stock remains deducted from store.');
        } else {
            req.flash('success_msg', 'Cancelled invoice record deleted.');
        }

        await logAction(req.user._id, 'DELETE', 'INTERNAL_SALES', req.params.id, `Deleted ${invoice.status} invoice: ${invoice.invoiceNo}`);
        await InternalInvoice.findByIdAndDelete(req.params.id);
        res.redirect('/internal/sales/summary');
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales/summary');
    }
};

exports.downloadSummaryPDF = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        let query = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        if (status) query.status = status;

        const invoices = await InternalInvoice.find(query).populate('clientId').sort({ date: -1 });

        let totalRevenue = 0;
        let totalCost = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'Cancelled') {
                totalRevenue += inv.grandTotal;
                inv.items.forEach(item => {
                    totalCost += (item.qty * item.costAtSale);
                });
            }
        });

        const netProfit = totalRevenue - totalCost;

        const pdfBuffer = await generateInternalSummaryPDF(
            invoices,
            { totalRevenue, totalCost, netProfit },
            { startDate, endDate }
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Sales_Summary_${Date.now()}.pdf`);
        await logAction(req.user._id, 'EXPORT', 'INTERNAL_SALES', 'SUMMARY', `Exported Sales Summary PDF (${startDate || 'Start'} to ${endDate || 'End'})`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating Summary PDF');
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const invoice = await InternalInvoice.findById(id);
        if (!invoice) return res.status(404).send('Invoice not found');

        const oldStatus = invoice.status;
        if (oldStatus === status) return res.redirect('/internal/sales/summary');

        if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
            for (const item of invoice.items) {
                await Inventory.findByIdAndUpdate(item.itemId, { $inc: { quantity: item.qty } });
            }
        }
        else if (oldStatus === 'Cancelled' && status !== 'Cancelled') {
            for (const item of invoice.items) {
                const invItem = await Inventory.findById(item.itemId);
                if (!invItem || invItem.quantity < item.qty) {
                    req.flash('error_msg', `Cannot restitute invoice: Insufficient stock for ${invItem ? invItem.itemName : 'item'}`);
                    return res.redirect('/internal/sales/summary');
                }
            }
            for (const item of invoice.items) {
                await Inventory.findByIdAndUpdate(item.itemId, { $inc: { quantity: -item.qty } });
            }
        }

        invoice.status = status;
        await invoice.save();

        await logAction(req.user._id, 'UPDATE_STATUS', 'INTERNAL_SALES', id, `Updated status of invoice ${invoice.invoiceNo} to ${status}`);

        req.flash('success_msg', `Invoice status updated to ${status}`);
        res.redirect('/internal/sales/summary');
    } catch (err) {
        console.error(err);
        res.redirect('/internal/sales/summary');
    }
};
