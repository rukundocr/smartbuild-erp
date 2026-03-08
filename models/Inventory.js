const mongoose = require('mongoose');
const Joi = require('joi');

const inventorySchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Electricity', 'Water', 'Construction']
    },
    subCategory: {
        type: String,
        required: true
        // Based on prompt: 
        // Electricity: (Conductors, Protection, Distribution/Control, Terminals/Access)
        // Water: (Pipes, Fittings, Control/Flow, Infrastructure/Storage)
        // Construction: (Structural, Envelope/Exterior, Finishes/Interiors, Site Tools)
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    buyingPrice: {
        type: Number,
        required: true
    },
    defaultSellingPrice: {
        type: Number,
        required: true
    },
    minStockLevel: {
        type: Number,
        required: true,
        default: 5
    }
}, {
    timestamps: true
});

// Joi Validation Schema
const validateInventory = (data) => {
    const schema = Joi.object({
        itemName: Joi.string().required().trim(),
        sku: Joi.string().required().trim(),
        category: Joi.string().valid('Electricity', 'Water', 'Construction').required(),
        subCategory: Joi.string().required(),
        quantity: Joi.number().min(0).required(),
        buyingPrice: Joi.number().min(0).required(),
        defaultSellingPrice: Joi.number().min(0).required(),
        minStockLevel: Joi.number().min(0).required()
    });
    return schema.validate(data);
};

inventorySchema.statics.generateSKU = async function (category) {
    const prefixMap = {
        'Electricity': 'ELE-',
        'Water': 'WAT-',
        'Construction': 'CON-'
    };
    const prefix = prefixMap[category] || 'GEN-';
    // Find items in this category and sort by SKU descending
    const latestItem = await this.findOne({ category, sku: new RegExp(`^${prefix}`) }).sort({ sku: -1 });

    if (!latestItem) return `${prefix}0001`;

    const parts = latestItem.sku.split('-');
    const lastNumber = parseInt(parts[parts.length - 1]);
    if (isNaN(lastNumber)) return `${prefix}0001`;

    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
    return `${prefix}${nextNumber}`;
};

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = { Inventory, validateInventory };
