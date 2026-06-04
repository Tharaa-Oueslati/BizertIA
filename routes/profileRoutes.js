const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const authMiddleware = require('../middleware/authMiddleware');
const { Student } = require('../models/Roles');
const Absence = require('../models/Absence');
const Enrollment = require('../models/Enrollment');

// ====================== MULTER SETUP ======================
const uploadDir = path.join('public', 'uploads', 'profile-pictures');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// ====================== GET PROFILE ======================
router.get('/', authMiddleware, async (req, res) => {
    try {
        const student = req.user;

        // Calculate Attendance Rate
        const absences = await Absence.find({ student: student._id });
        const unjustified = absences.filter(a => !a.isJustified).length;
        const total = absences.length || 1;
        const attendanceRate = Math.max(0, ((total - unjustified) / total) * 100);

        const activeEnrollment = await Enrollment.findOne({
            student: student._id,
            status: 'active'
        });

        res.render('profile', {
            user: {
                ...student.toObject(),
                attendanceRate: parseFloat(attendanceRate.toFixed(1)),
                currentSemester: activeEnrollment 
                    ? `${activeEnrollment.semester} ${activeEnrollment.academicYear}` 
                    : 'No active semester'
            }
        });
    } catch (err) {
        console.error('Profile GET error:', err);
        res.status(500).send('Server error');
    }
});

// ====================== UPDATE PROFILE ======================
router.post('/', authMiddleware, upload.single('profilePicture'), async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;
        const updateData = { firstName, lastName, email };

        if (req.file) {
            updateData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
        }

        const updatedUser = await Student.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );

        if (!updatedUser) {
            return res.json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, message: 'Profile updated successfully!' });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
});

// ====================== CHANGE PASSWORD ======================
router.post('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await Student.findById(req.user._id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.json({ success: false, error: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ success: false, error: 'Failed to update password' });
    }
});

module.exports = router;