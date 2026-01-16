const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    clientName: { type: String, required: true },
    contractAmount: { type: Number, required: true }, // Store as Number for math
    status: { 
        type: String, 
        enum: ['Active', 'Completed', 'On Hold'], 
        default: 'Active' 
    },
    startDate: { type: Date, default: Date.now },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Tracking
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);