const nodemailer = require('nodemailer');

/**
 * Send a verification email using nodemailer.
 * @param {string} to - Recipient email address
 * @param {string} verifyURL - Verification link URL
 * @returns {Promise<void>}
 */
async function sendVerificationEmail(to, verifyURL) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        logger: true,
        debug: true
    });

    const emailHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body { margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { 
                    max-width: 600px; 
                    margin: 20px auto; 
                    padding: 20px; 
                    font-family: Arial, sans-serif; 
                    background-color: #ffffff; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05); 
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    font-size: 16px;
                    color: #ffffff !important; 
                    background-color: #007bff; 
                    border-radius: 5px;
                    text-decoration: none;
                    font-weight: bold;
                    border: 1px solid #007bff;
                }
                .footer {
                    margin-top: 25px;
                    font-size: 12px;
                    color: #888888;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2 style="color: #333;">🚀 Action Required: Verify Your Email Address</h2>
                <p style="color: #555; line-height: 1.6;">Hello,</p>
                <p style="color: #555; line-height: 1.6;">Thank you for signing up with <strong>SocialSphere</strong>! Please click the button below to confirm your email and activate your account.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyURL}" class="button">Verify My Email Address</a>
                </div>
                <p style="color: #555; line-height: 1.6;">If the button above does not work, please copy and paste the following link into your web browser:</p>
                <p style="word-break: break-all; font-size: 14px; color: #007bff;">${verifyURL}</p>
                <div class="footer">
                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 15px 0;">
                    <p>This email was sent by SocialSphere. If you did not register for this service, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: '🚀 Action Required: Verify Your Email Address for SocialSphere',
        html: emailHTML
    });
}

/**
 * Send a password reset email with a reset link.
 * @param {string} to - Recipient email address
 * @param {string} resetURL - Password reset link URL
 */
async function sendPasswordResetEmail(to, resetURL) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:20px auto; padding:20px; background:#fff; border-radius:8px;">
            <h2 style="color:#333;">Password Reset Request</h2>
            <p style="color:#555; line-height:1.5;">We received a request to reset your SocialSphere password. Click the button below to reset it. This link expires in one hour.</p>
            <div style="text-align:center; margin:30px 0;">
                <a href="${resetURL}" style="display:inline-block;padding:12px 22px;background:#007bff;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
            </div>
            <p style="color:#555;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#007bff;">${resetURL}</p>
            <hr style="margin-top:20px;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#888;">If you did not request a password reset, please ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: 'SocialSphere — Password Reset',
        html: emailHTML
    });
}

/**
 * Send a confirmation email when absences are justified by AI.
 * @param {string} to - Recipient email address
 * @param {string} studentName - Name of the student
 * @param {Array} justificationDetails - Details about the dates and results
 *//**
 * Send a confirmation email when absences are justified by AI.
 */
async function sendJustificationConfirmation(to, studentName, aiResult, dbMessage, subjectNames) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Create the HTML list of subjects
    const subjectsListHTML = (subjectNames && subjectNames.length > 0)
        ? subjectNames.map(name => `<li style="margin-bottom: 4px;"><strong>${name}</strong></li>`).join('')
        : '<li>No specific subject details available.</li>';

    const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:20px auto; padding:20px; background:#fff; border-radius:8px; border: 1px solid #eee;">
            <h2 style="color:#28a745;"> Absence Justified Successfully</h2>
            <p style="color:#555; line-height:1.6;">Hello <strong>${studentName}</strong>,</p>
            <p style="color:#555; line-height:1.6;">Atlas AI has processed your medical certificate. Here are the details of the justification:</p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Period Identified:</strong> ${aiResult.startDate} to ${aiResult.endDate}</p>
                <p style="margin: 0 0 10px 0;"><strong>Status:</strong> ${dbMessage}</p>
                
                <div style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                    <p style="margin: 0 0 5px 0; color: #333;"><strong>Subjects Justified:</strong></p>
                    <ul style="margin: 0; padding-left: 20px; color: #374151;">
                        ${subjectsListHTML}
                    </ul>
                </div>
            </div>

            <p style="color:#555; line-height:1.6;">Your attendance records have been updated automatically. You can view the changes in your CampusHub dashboard.</p>
            
            <hr style="margin-top:20px; border:none; border-top:1px solid #eee;">
            <p style="font-size:12px; color:#888; text-align:center;">This is an automated confirmation from SocialSphere / CampusHub.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: 'Absence Justification Confirmed - SocialSphere',
        html: emailHTML
    });
}

/**
 * Send a confirmation email when an internship document is validated and saved.
 * @param {string} to - Recipient student email address
 * @param {string} studentName - Full name of the student
 * @param {Object} internshipData - The parsed/saved internship record details
 */
async function sendInternshipValidationEmail(to, studentName, internshipData) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:20px auto; padding:20px; background:#fff; border-radius:8px; border: 1px solid #eee;">
            <h2 style="color:#1d4ed8;">💼 Internship Document Validated Successfully</h2>
            <p style="color:#555; line-height:1.6;">Hello <strong>${studentName}</strong>,</p>
            <p style="color:#555; line-height:1.6;">Great news! Atlas AI has processed and successfully validated your internship attestation document.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 20px; color: #334155;">
                <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Internship Profile Details:</h3>
                <p style="margin: 0 0 8px 0;"><strong>Enterprise/Company:</strong> ${internshipData.enterpriseName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Department:</strong> ${internshipData.department || 'N/A'}</p>
                <p style="margin: 0 0 8px 0;"><strong>Stated Duration:</strong> ${internshipData.durationMonths} Months (${internshipData.durationDays} calendar days)</p>
                <p style="margin: 0 0 8px 0;"><strong>Timeline Period:</strong> ${internshipData.startDate} to ${internshipData.endDate}</p>
                <p style="margin: 0 0 8px 0;"><strong>Supervisor Name:</strong> ${internshipData.supervisorName || 'N/A'}</p>
                
                <div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <p style="margin: 0; font-style: italic; color: #475569;">
                        <strong>Extracted Mission:</strong> "${internshipData.project || 'No summary description extracted.'}"
                    </p>
                </div>
            </div>

            <p style="color:#555; line-height:1.6;">This record has been officially committed to your permanent tracking profile. You can inspect your timeline history or download the copy from your student dashboard anytime.</p>
            
            <hr style="margin-top:20px; border:none; border-top:1px solid #eee;">
            <p style="font-size:12px; color:#888; text-align:center;">This is an automated documentation notification from SocialSphere / CampusHub.</p>
        </div>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: `🎉 Internship Confirmed: ${internshipData.enterpriseName} - SocialSphere`,
        html: emailHTML
    });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail,sendJustificationConfirmation,sendInternshipValidationEmail };