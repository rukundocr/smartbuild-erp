const mongoose = require('mongoose');
const Joi = require('joi');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    tin: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    }
}, {
    timestamps: true
});

// Joi Validation Schema
const validateSupplier = (data) => {
    const schema = Joi.object({
        name: Joi.string().required().trim(),
        tin: Joi.string().allow('', null).trim(),
        phone: Joi.string().required().trim(),
        address: Joi.string().allow('', null).trim(),
        email: Joi.string().email().allow('', null).trim()
    });
    return schema.validate(data);
};

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = { Supplier, validateSupplier };
