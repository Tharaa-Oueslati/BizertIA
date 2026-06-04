const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const authMiddleware = require('../middleware/authMiddleware');
const { ask_agent } = require('../services/aiInternshipAgent');
const Internship = require('../models/Internship'); 
const { sendInternshipValidationEmail} = require('../routes/email');

// ─── GET /internships/submission ─────────────────────────────────────────────
router.get('/submission', authMiddleware, async (req, res) => {
    try {
        // Fetch all validated records for the logged-in student
        const pastInternships = await Internship.find({ student: req.user._id }).sort({ submittedAt: -1 });
        
        // Pass the pastInternships array directly into your EJS template view
        res.render("internships", { user: req.user, pastInternships });
    } catch (error) {
        console.error("Error fetching past internships:", error);
        res.status(500).send("Server Error loading page");
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/internships');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `internship-${uniqueSuffix}.pdf`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are accepted.'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── POST /api/internships/analyze ───────────────────────────────────────────
router.post('/analyze', authMiddleware, upload.single('pdfFile'), async (req, res) => {
    const student = req.user;

    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    try {
        const pdfPath = path.resolve(req.file.path);
        const studentFullName = `${student.firstName} ${student.lastName}`;

        const aiResult = await ask_agent(pdfPath, studentFullName);

        // Case 1: AI claims document invalid
        if (!aiResult.valid) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.json({
                success: false,
                aiResponse: aiResult.chatMessage,
                statusMessage: "Document rejected: not a valid internship certificate.",
                data: null
            });
        }

        // Case 2: Student name mismatch 
        if (aiResult.isStudentMatch === false) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.json({
                success: false,
                aiResponse: `The document is for "${aiResult.studentName}", but your profile name is "${studentFullName}". Please upload your own internship document.`,
                statusMessage: "Name mismatch. Document rejected.",
                data: null
            });
        }

        // ─── OVERLAP CHECK LOGIC ───────────────────────────────────────────────
        if (aiResult.startDate && aiResult.endDate) {
            
            // Look for conflict with existing items for this student in MongoDB
            const overlappingInternship = await Internship.findOne({
                student: student._id, // Aligned to match your schema's relational field
                enterpriseName: { $regex: new RegExp(`^${aiResult.enterpriseName}$`, 'i') }, 
                $or: [
                    {
                        // Condition 1: New internship starts during an existing one
                        startDate: { $lte: new Date(aiResult.startDate) },
                        endDate: { $gte: new Date(aiResult.startDate) }
                    },
                    {
                        // Condition 2: New internship ends during an existing one
                        startDate: { $lte: new Date(aiResult.endDate) },
                        endDate: { $gte: new Date(aiResult.endDate) }
                    },
                    {
                        // Condition 3: New internship completely swallows/encloses an old one
                        startDate: { $gte: new Date(aiResult.startDate) },
                        endDate: { $lte: new Date(aiResult.endDate) }
                    }
                ]
            });

            if (overlappingInternship) {
                console.log(`⚠️ Overlap detected with Internship ID: ${overlappingInternship._id}`);
                
                // Cleanup uploaded local file
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); 

                return res.json({
                    success: false,
                    aiResponse: `Submission rejected. You already have an internship registered at "${aiResult.enterpriseName}" that overlaps with this time period (${aiResult.startDate} to ${aiResult.endDate}).`,
                    statusMessage: "Timeline overlap conflict detected.",
                    data: null
                });
            }
        }
        // ───────────────────────────────────────────────────────────────────────

        // Case 3: Valid document & passes overlap check -> SAVING TO DB
        const internship = new Internship({
            student: student._id,
            enterpriseName: aiResult.enterpriseName,
            department: aiResult.department,
            project: aiResult.project,
            startDate: aiResult.startDate ? new Date(aiResult.startDate) : null,
            endDate: aiResult.endDate ? new Date(aiResult.endDate) : null,
            durationDays: aiResult.durationDays,
            durationMonths: aiResult.durationMonths,
            supervisorName: aiResult.supervisorName,
            documentUrl: `/api/internships/uploads/internships/${req.file.filename}`
        });
        
        await internship.save(); 
        sendInternshipValidationEmail(student.email, studentFullName, aiResult).catch(err => console.error("⚠️ Failed to fire validation email notification:", err));

        return res.json({
            success: true,
            aiResponse: aiResult.chatMessage,
            statusMessage: `Internship at "${aiResult.enterpriseName}" successfully recorded.`,
            data: internship 
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error("❌ Internship route error:", error);
        return res.status(500).json({ error: 'AI processing failed. Please try again.' });
    }
});

// ─── GET /api/internships/uploads/internships/:filename ──────────────────────
router.get('/uploads/internships/:filename', authMiddleware, (req, res) => {
    const filePath = path.join(__dirname, '../../uploads/internships', req.params.filename);

    if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
    } else {
        return res.status(404).send('Document not found.');
    }
});

module.exports = router;