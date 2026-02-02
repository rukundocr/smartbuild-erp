const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    twoFactorSecret: { type: String },
    isTwoFactorEnabled: { type: Boolean, default: false },
    role: { 
        type: String, 
        enum: ['admin', 'staff'], 
        default: 'staff' 
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);