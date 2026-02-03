const mongoose = require('mongoose'); // <--- ADD THIS LINE

const CasualWorkerSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true }, 
    phoneNumber: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CasualWorker', CasualWorkerSchema);