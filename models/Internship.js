const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Matches your student/user collection name
        required: true
    },
    enterpriseName: { type: String, required: true },
    department: { type: String, default: null },
    project: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    durationDays: { type: Number, default: null },
    durationMonths: { type: Number, default: null },
    supervisorName: { type: String, default: null },
    documentUrl: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Internship', InternshipSchema);