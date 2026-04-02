const { Supplier, validateSupplier } = require('../models/Supplier');
const { logAction } = require('../utils/logger');

// Get all suppliers
exports.getSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();
        res.render('suppliers/index', { suppliers });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { layout: false });
    }
};

// Create a new supplier
exports.createSupplier = async (req, res) => {
    try {
        const { error } = validateSupplier(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect('/internal/suppliers');
        }

        const newSupplier = new Supplier(req.body);
        await newSupplier.save();

        await logAction(req.user._id, 'CREATE', 'SUPPLIER', newSupplier._id, `Created supplier: ${newSupplier.name}`);
        req.flash('success_msg', 'Supplier added successfully');
        res.redirect('/internal/suppliers');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Server error while adding supplier');
        res.redirect('/internal/suppliers');
    }
};

// Edit supplier (GET)
exports.getEditSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id).lean();
        if (!supplier) {
            req.flash('error_msg', 'Supplier not found');
            return res.redirect('/internal/suppliers');
        }
        res.render('suppliers/edit', { supplier });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/suppliers');
    }
};

// Update supplier (POST)
exports.updateSupplier = async (req, res) => {
    try {
        const { error } = validateSupplier(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect(`/internal/suppliers/edit/${req.params.id}`);
        }

        const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await logAction(req.user._id, 'UPDATE', 'SUPPLIER', supplier._id, `Updated supplier: ${supplier.name}`);
        req.flash('success_msg', 'Supplier updated successfully');
        res.redirect('/internal/suppliers');
    } catch (err) {
        console.error(err);
        res.redirect('/internal/suppliers');
    }
};

// Delete supplier (POST)
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (supplier) {
            await logAction(req.user._id, 'DELETE', 'SUPPLIER', supplier._id, `Deleted supplier: ${supplier.name}`);
            req.flash('success_msg', 'Supplier deleted');
        }
        res.redirect('/internal/suppliers');
    } catch (err) {
        console.error(err);
        res.redirect('/internal/suppliers');
    }
};
