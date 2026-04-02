const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: true
    },
    quantityRequested: {
        type: Number,
        required: true,
        min: 0.01
    },
    quantityDelivered: {
        type: Number,
        default: 0
    },
    buyingPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Partial', 'Delivered'],
        default: 'Pending'
    }
});

const purchaseOrderSchema = new mongoose.Schema({
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    items: [purchaseOrderItemSchema],
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Partial', 'Completed', 'Cancelled'],
        default: 'Sent'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
