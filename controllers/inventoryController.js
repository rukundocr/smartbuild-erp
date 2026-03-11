const { Inventory, validateInventory } = require('../models/Inventory');
const { logAction } = require('../utils/logger');
const { generateInventoryPDF } = require('../utils/inventoryPdfGenerator');

exports.getInventory = async (req, res) => {
    try {
        const items = await Inventory.find().sort({ createdAt: -1 });
        res.render('inventory/index', {
            title: 'Internal Inventory | SmartBuild',
            items
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching inventory');
        res.redirect('/');
    }
};

exports.getAddInventoryForm = async (req, res) => {
    res.render('inventory/new', {
        title: 'Add New Inventory'
    });
};

exports.addInventory = async (req, res) => {
    try {
        const { items } = req.body;
        const itemsArray = Array.isArray(items) ? items : Object.values(items || {});

        if (itemsArray.length === 0) {
            req.flash('error_msg', 'No items added');
            return res.redirect('/internal/inventory/new');
        }

        const savedItems = [];
        for (const itemData of itemsArray) {
            // Basic cleaning of number fields
            itemData.quantity = parseFloat(itemData.quantity) || 0;
            itemData.minStockLevel = parseFloat(itemData.minStockLevel) || 0;
            itemData.buyingPrice = parseFloat(itemData.buyingPrice) || 0;
            itemData.defaultSellingPrice = parseFloat(itemData.defaultSellingPrice) || 0;

            const { error } = validateInventory(itemData);
            if (error) {
                req.flash('error_msg', `Error in item "${itemData.itemName}": ${error.details[0].message}`);
                return res.redirect('/internal/inventory/new');
            }

            const newItem = new Inventory(itemData);
            await newItem.save();
            savedItems.push(newItem);

            await logAction(req.user._id, 'CREATE', 'INTERNAL_INVENTORY', newItem._id, `Added item: ${newItem.itemName}`);
        }

        req.flash('success_msg', `${savedItems.length} items added to inventory`);
        res.redirect('/internal/inventory');
    } catch (err) {
        console.error("Add Inventory Error:", err);
        if (err.code === 11000) {
            req.flash('error_msg', 'Error: One of the SKUs already exists. SKUs must be unique.');
        } else {
            req.flash('error_msg', 'Error adding items');
        }
        res.redirect('/internal/inventory/new');
    }
};

exports.updateInventory = async (req, res) => {
    try {
        const { error } = validateInventory(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect('/internal/inventory');
        }

        const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await logAction(req.user._id, 'UPDATE', 'INTERNAL_INVENTORY', req.params.id, `Updated item: ${item.itemName}`);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, item });
        }

        req.flash('success_msg', 'Inventory item updated');
        res.redirect('/internal/inventory');
    } catch (err) {
        console.error(err);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ success: false, message: 'Error updating item' });
        }
        req.flash('error_msg', 'Error updating item');
        res.redirect('/internal/inventory');
    }
};

exports.deleteInventory = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);
        if (item) {
            await logAction(req.user._id, 'DELETE', 'INTERNAL_INVENTORY', req.params.id, `Deleted item: ${item.itemName}`);
            await Inventory.findByIdAndDelete(req.params.id);
        }
        req.flash('success_msg', 'Item removed from inventory');
        res.redirect('/internal/inventory');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting item');
        res.redirect('/internal/inventory');
    }
};

exports.getNextSKU = async (req, res) => {
    try {
        const { category } = req.params;
        const nextSku = await Inventory.generateSKU(category);
        res.json({ nextSku });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error generating SKU' });
    }
};

exports.downloadInventoryPDF = async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        if (category && category !== 'All' && category !== '') {
            filter.category = category;
        }

        const items = await Inventory.find(filter).sort({ itemName: 1 });

        const pdfBuffer = await generateInventoryPDF(items, category || 'All');

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Inventory_Report_${category || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`,
            'Content-Length': pdfBuffer.byteLength
        });

        res.send(Buffer.from(pdfBuffer));

        await logAction(req.user._id, 'DOWNLOAD', 'INTERNAL_INVENTORY', null, `Downloaded PDF report for category: ${category || 'All'}`);

    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error generating PDF');
        res.redirect('/internal/inventory');
    }
};
