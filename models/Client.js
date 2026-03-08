const mongoose = require('mongoose');
const Joi = require('joi');

const clientSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    }
}, {
    timestamps: true
});

// Joi Validation Schema
const validateClient = (data) => {
    const schema = Joi.object({
        clientName: Joi.string().required().trim(),
        phone: Joi.string().required().trim(),
        address: Joi.string().required().trim(),
        email: Joi.string().email().required().trim()
    });
    return schema.validate(data);
};

const Client = mongoose.model('Client', clientSchema);

module.exports = { Client, validateClient };
