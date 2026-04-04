const PurchaseOrder = require('../models/PurchaseOrder');
const { Supplier } = require('../models/Supplier');
const { Inventory } = require('../models/Inventory');
const { logAction } = require('../utils/logger');
const { generatePurchaseOrderPDF } = require('../utils/purchaseOrderPdf');

// 1. Get All Purchase Orders
exports.getPurchaseOrders = async (req, res) => {
    try {
        const pos = await PurchaseOrder.find()
            .populate('supplier')
            .populate('items.item')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate total for each PO
        const posWithTotals = pos.map(po => {
            let total = 0;
            if (po.items) {
                po.items.forEach(item => {
                    total += (item.quantityRequested || 0) * (item.buyingPrice || 0);
                });
            }
            return { ...po, totalAmount: total };
        });

        res.render('purchase-orders/index', { 
            pos: posWithTotals,
            currentTab: 'purchase-orders'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { layout: false });
    }
};

// 2. Render Create Purchase Order Form
exports.getCreatePO = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ name: 1 }).lean();
        const inventoryItems = await Inventory.find().sort({ itemName: 1 }).lean();
        // Get unique categories
        const categories = [...new Set(inventoryItems.map(item => item.category))].sort();
        res.render('purchase-orders/create', { 
            suppliers, 
            items: inventoryItems, 
            categories,
            currentTab: 'purchase-orders'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { layout: false });
    }
};

// 3. Create a New Purchase Order
exports.createPO = async (req, res) => {
    try {
        const { supplier, expectedDate, notes, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            req.flash('error_msg', 'Please add at least one item to the order');
            return res.redirect('/internal/purchase-orders/create');
        }

        const poItems = items.map(item => ({
            item: item.itemId,
            quantityRequested: parseFloat(item.quantity),
            buyingPrice: parseFloat(item.price),
            status: 'Pending'
        }));

        const newPO = new PurchaseOrder({
            supplier,
            expectedDate,
            notes,
            items: poItems,
            createdBy: req.user._id,
            status: 'Sent'
        });

        await newPO.save();
        await logAction(req.user._id, 'CREATE', 'PURCHASE_ORDER', newPO._id, `Created Purchase Order for supplier: ${supplier}`);

        req.flash('success_msg', 'Purchase Order created successfully');
        res.redirect('/internal/purchase-orders');
    } catch (err) {
        console.error('Error creating PO:', err);
        req.flash('error_msg', 'Failed to create Purchase Order');
        res.redirect('/internal/purchase-orders/create');
    }
};

// 4. Render Receive / Confirm Delivery Form
exports.getReceivePO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.item')
            .lean();

        if (!po) {
            req.flash('error_msg', 'Purchase Order not found');
            return res.redirect('/internal/purchase-orders');
        }

        res.render('purchase-orders/receive', { po });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/purchase-orders');
    }
};

// 5. Confirm Delivery (Update Inventory)
exports.confirmDelivery = async (req, res) => {
    try {
        const { deliveries } = req.body; // Array of { poItemId, quantityDelivered }
        const poId = req.params.id;

        const po = await PurchaseOrder.findById(poId);
        if (!po) return res.status(404).send('PO not found');

        let totalItemsInPO = po.items.length;
        let completedItems = 0;

        for (const delivery of deliveries) {
            const poItem = po.items.id(delivery.poItemId);
            if (!poItem) continue;

            const quantityToAdd = parseFloat(delivery.quantityDelivered);
            if (isNaN(quantityToAdd) || quantityToAdd <= 0) continue;

            // Updated quantities
            poItem.quantityDelivered += quantityToAdd;
            
            if (poItem.quantityDelivered >= poItem.quantityRequested) {
                poItem.status = 'Delivered';
            } else if (poItem.quantityDelivered > 0) {
                poItem.status = 'Partial';
            }

            // Update Inventory Quantity
            const inventoryItem = await Inventory.findById(poItem.item);
            if (inventoryItem) {
                inventoryItem.quantity += quantityToAdd;
                // Also update the buying price if it has changed? 
                // Usually yes, but let's just stick to quantity for now as per prompt.
                await inventoryItem.save();
            }

            if (poItem.status === 'Delivered') completedItems++;
        }

        // Update overall PO status
        const allDelivered = po.items.every(item => item.status === 'Delivered');
        const anyDelivered = po.items.some(item => item.quantityDelivered > 0);

        if (allDelivered) {
            po.status = 'Completed';
        } else if (anyDelivered) {
            po.status = 'Partial';
        }

        await po.save();
        await logAction(req.user._id, 'UPDATE', 'PURCHASE_ORDER', po._id, `Confirmed delivery for PO: ${po._id}`);

        req.flash('success_msg', 'Deliveries confirmed and inventory updated');
        res.redirect(`/internal/purchase-orders/receive/${poId}`);

    } catch (err) {
        console.error('Error confirming delivery:', err);
        req.flash('error_msg', 'Failed to confirm delivery');
        res.redirect('/internal/purchase-orders');
    }
};

// 6. Render Edit Purchase Order Form
exports.getEditPO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.item')
            .lean();

        if (!po) {
            req.flash('error_msg', 'Purchase Order not found');
            return res.redirect('/internal/purchase-orders');
        }

        // Only allow editing if no items have been delivered
        const anyDelivered = po.items.some(item => item.quantityDelivered > 0);
        if (anyDelivered) {
            req.flash('error_msg', 'Cannot edit PO that has partial deliveries. Please create a new one instead.');
            return res.redirect('/internal/purchase-orders');
        }

        const suppliers = await Supplier.find().sort({ name: 1 }).lean();
        const inventoryItems = await Inventory.find().sort({ itemName: 1 }).lean();
        const categories = [...new Set(inventoryItems.map(item => item.category))].sort();

        res.render('purchase-orders/edit', { po, suppliers, items: inventoryItems, categories });
    } catch (err) {
        console.error(err);
        res.redirect('/internal/purchase-orders');
    }
};

// 7. Update Purchase Order
exports.updatePO = async (req, res) => {
    try {
        const { supplier, expectedDate, notes, items } = req.body;
        const poId = req.params.id;

        const po = await PurchaseOrder.findById(poId);
        if (!po) return res.status(404).send('PO not found');

        // Safety check again
        const anyDelivered = po.items.some(item => item.quantityDelivered > 0);
        if (anyDelivered) {
            req.flash('error_msg', 'Cannot update PO that has partial deliveries.');
            return res.redirect('/internal/purchase-orders');
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            req.flash('error_msg', 'Please add at least one item to the order');
            return res.redirect(`/internal/purchase-orders/edit/${poId}`);
        }

        const poItems = items.map(item => ({
            item: item.itemId,
            quantityRequested: parseFloat(item.quantity),
            buyingPrice: parseFloat(item.price),
            status: 'Pending'
        }));

        po.supplier = supplier;
        po.expectedDate = expectedDate;
        po.notes = notes;
        po.items = poItems;

        await po.save();
        await logAction(req.user._id, 'UPDATE', 'PURCHASE_ORDER', po._id, `Updated Purchase Order: ${po._id}`);

        req.flash('success_msg', 'Purchase Order updated successfully');
        res.redirect('/internal/purchase-orders');
    } catch (err) {
        console.error('Error updating PO:', err);
        req.flash('error_msg', 'Failed to update Purchase Order');
        res.redirect(`/internal/purchase-orders/edit/${req.params.id}`);
    }
};

// 8. Delete Purchase Order
exports.deletePO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) {
            req.flash('error_msg', 'Purchase Order not found');
            return res.redirect('/internal/purchase-orders');
        }

        // Only allow deleting if no items have been delivered
        const anyDelivered = po.items.some(item => item.quantityDelivered > 0);
        if (anyDelivered) {
            req.flash('error_msg', 'Cannot delete PO that has partial deliveries.');
            return res.redirect('/internal/purchase-orders');
        }

        await PurchaseOrder.findByIdAndDelete(req.params.id);
        await logAction(req.user._id, 'DELETE', 'PURCHASE_ORDER', po._id, `Deleted Purchase Order: ${po._id}`);

        req.flash('success_msg', 'Purchase Order deleted');
        res.redirect('/internal/purchase-orders');
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { layout: false });
    }
};

// 9. Download Purchase Order PDF
exports.downloadPDF = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.item');

        if (!po) return res.status(404).send('Purchase Order not found');

        const pdfBuffer = await generatePurchaseOrderPDF(po);

        await logAction(req.user._id, 'EXPORT', 'PURCHASE_ORDER', req.params.id, `Exported PO PDF: ${po._id}`);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=PurchaseOrder_${po._id}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
};
