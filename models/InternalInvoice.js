const mongoose = require('mongoose');
const Joi = require('joi');

const internalInvoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: true,
        unique: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory',
            required: true
        },
        qty: {
            type: Number,
            required: true,
            min: 1
        },
        costAtSale: {
            type: Number,
            required: true
        },
        priceAtSale: {
            type: Number,
            required: true
        }
    }],
    grandTotal: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Paid', 'Pending', 'Cancelled'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

// Joi Validation Schema
const validateInternalInvoice = (data) => {
    const itemSchema = Joi.object({
        itemId: Joi.string().required(), // Joi validates string ID for input
        qty: Joi.number().min(1).required(),
        costAtSale: Joi.number().min(0).required(),
        priceAtSale: Joi.number().min(0).required()
    });

    const schema = Joi.object({
        clientId: Joi.string().required(),
        invoiceNo: Joi.string().required(),
        items: Joi.array().items(itemSchema).min(1).required(),
        grandTotal: Joi.number().min(0).required(),
        date: Joi.date(),
        status: Joi.string().valid('Paid', 'Pending', 'Cancelled')
    });
    return schema.validate(data);
};

const InternalInvoice = mongoose.model('InternalInvoice', internalInvoiceSchema);

module.exports = { InternalInvoice, validateInternalInvoice };
