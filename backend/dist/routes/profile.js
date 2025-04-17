"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const util_1 = require("../db/util");
const optService_1 = __importDefault(require("../services/optService"));
const redisClient_1 = __importDefault(require("../redisClient"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const s3Service_1 = __importDefault(require("../services/s3Service"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Configure email transporter
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'your_smtp_username',
        pass: process.env.SMTP_PASS || 'your_smtp_password'
    }
});
// Email sending function
function sendEmail(to, subject, text, html) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || '"Food Donation App" <noreply@fooddonationapp.com>',
                to,
                subject,
                text,
                html
            };
            const info = yield transporter.sendMail(mailOptions);
            console.log(`Email sent: ${info.messageId}`);
            return true;
        }
        catch (error) {
            console.error('Email sending error:', error);
            throw new Error('Failed to send email');
        }
    });
}
// Validation schemas with updated fields
const basicProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(255),
    email: zod_1.z.string().email().max(255),
    phone: zod_1.z.string().max(50).optional(),
    address: zod_1.z.string().optional(),
    profile_picture: zod_1.z.string().optional().nullable(),
});
const donorDetailsSchema = zod_1.z.object({
    donor_type: zod_1.z.enum(['INDIVIDUAL', 'RESTAURANT', 'CORPORATE']),
    organization_name: zod_1.z.string().max(255),
    organization_details: zod_1.z.string().optional(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50),
    operating_hours: zod_1.z.string().max(255)
});
// Updated NGO schema with new verification fields
const ngoDetailsSchema = zod_1.z.object({
    ngo_name: zod_1.z.string().max(255),
    mission_statement: zod_1.z.string(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50),
    operating_hours: zod_1.z.string().max(255),
    target_demographics: zod_1.z.string(),
    // New fields from the updated schema
    ngo_type: zod_1.z.string().max(50).optional().nullable(),
    registration_number: zod_1.z.string().max(100).optional().nullable(),
    registration_certificate: zod_1.z.string().max(255).optional().nullable(),
    pan_number: zod_1.z.string().max(20).optional().nullable(),
    pan_card_image: zod_1.z.string().max(255).optional().nullable(),
    fcra_number: zod_1.z.string().max(100).optional().nullable(),
    fcra_certificate: zod_1.z.string().max(255).optional().nullable(),
    tax_exemption_certificate: zod_1.z.string().max(255).optional().nullable(),
    annual_reports_link: zod_1.z.string().max(255).optional().nullable()
});
// Updated recipient schema with new verification fields
const recipientDetailsSchema = zod_1.z.object({
    recipient_name: zod_1.z.string().max(255),
    recipient_details: zod_1.z.string(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50),
    // New fields from the updated schema
    id_type: zod_1.z.string().max(50).optional().nullable(),
    id_number: zod_1.z.string().max(100).optional().nullable(),
    id_image: zod_1.z.string().max(255).optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    proof_of_need: zod_1.z.string().optional().nullable()
});
// Get user profile with role-specific details
router.get('/', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const userQuery = yield (0, util_1.query)('SELECT id, username, email, phone, role, profile_picture, address, created_at, updated_at FROM users WHERE id = $1', [user.id]);
        if (!userQuery.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const userData = userQuery.rows[0];
        let roleDetails = null;
        // Fetch role-specific details
        if (user.role.toUpperCase() === 'DONOR') {
            const roleQuery = yield (0, util_1.query)('SELECT * FROM donors WHERE user_id = $1', [user.id]);
            roleDetails = roleQuery.rows[0];
        }
        else if (user.role.toUpperCase() === 'NGO') {
            const roleQuery = yield (0, util_1.query)('SELECT * FROM ngos WHERE user_id = $1', [user.id]);
            roleDetails = roleQuery.rows[0];
        }
        else if (user.role.toUpperCase() === 'RECIPIENT') {
            const roleQuery = yield (0, util_1.query)('SELECT * FROM recipients WHERE user_id = $1', [user.id]);
            roleDetails = roleQuery.rows[0];
        }
        return res.status(200).json({
            success: true,
            user: userData,
            roleDetails
        });
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
}));
router.put('/basic', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const validationResult = basicProfileSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: validationResult.error.errors
            });
        }
        const { username, email, phone, address, profile_picture } = validationResult.data;
        // Get current user data
        const currentUser = yield (0, util_1.query)('SELECT username, email, role FROM users WHERE id = $1', [user.id]);
        if (!currentUser.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Only check conflicts if username or email is changing
        const needsConflictCheck = username !== currentUser.rows[0].username ||
            email !== currentUser.rows[0].email;
        if (needsConflictCheck) {
            const existingUser = yield (0, util_1.query)('SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3', [username, email, user.id]);
            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Username or email already taken'
                });
            }
        }
        const updateQuery = yield (0, util_1.query)(`UPDATE users 
       SET username = $1, email = $2, phone = $3, address = $4, profile_picture = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, username, email, phone, address, profile_picture, role, updated_at`, [username, email, phone, address, profile_picture, user.id]);
        // Create entry in role-specific table if it doesn't exist yet
        // This ensures the user has a record to update when filling role details
        const role = currentUser.rows[0].role.toUpperCase();
        if (role === 'DONOR') {
            const existingDonor = yield (0, util_1.query)('SELECT * FROM donors WHERE user_id = $1', [user.id]);
            if (existingDonor.rows.length === 0) {
                // Create initial donor record
                yield (0, util_1.query)(`INSERT INTO donors (user_id, created_at, updated_at) 
           VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [user.id]);
            }
        }
        else if (role === 'NGO') {
            const existingNGO = yield (0, util_1.query)('SELECT * FROM ngos WHERE user_id = $1', [user.id]);
            if (existingNGO.rows.length === 0) {
                // Create initial NGO record
                yield (0, util_1.query)(`INSERT INTO ngos (user_id, created_at, updated_at) 
           VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [user.id]);
            }
        }
        else if (role === 'RECIPIENT') {
            const existingRecipient = yield (0, util_1.query)('SELECT * FROM recipients WHERE user_id = $1', [user.id]);
            if (existingRecipient.rows.length === 0) {
                // Create initial recipient record
                yield (0, util_1.query)(`INSERT INTO recipients (user_id, created_at, updated_at) 
           VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [user.id]);
            }
        }
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: updateQuery.rows[0]
        });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile',
        });
    }
}));
router.put('/role-details', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id) || !(user === null || user === void 0 ? void 0 : user.role)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        let validationResult = null;
        let existingRecord = null;
        let updateQuery = null;
        let verificationNeeded = false;
        switch (user.role.toUpperCase()) {
            case 'DONOR':
                // Check if donor record exists
                existingRecord = yield (0, util_1.query)('SELECT * FROM donors WHERE user_id = $1', [user.id]);
                validationResult = donorDetailsSchema.safeParse(req.body);
                if (validationResult.success) {
                    const { donor_type, organization_name, organization_details, contact_person, contact_number, operating_hours } = validationResult.data;
                    if (!existingRecord.rows.length) {
                        // Insert new record
                        updateQuery = yield (0, util_1.query)(`INSERT INTO donors (user_id, donor_type, organization_name, organization_details, 
               contact_person, contact_number, operating_hours, is_verified, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING *`, [user.id, donor_type, organization_name, organization_details,
                            contact_person, contact_number, operating_hours]);
                    }
                    else {
                        // Update existing record
                        updateQuery = yield (0, util_1.query)(`UPDATE donors 
               SET donor_type = $2, organization_name = $3, organization_details = $4,
                   contact_person = $5, contact_number = $6, operating_hours = $7,
                   updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $1
               RETURNING *`, [user.id, donor_type, organization_name, organization_details,
                            contact_person, contact_number, operating_hours]);
                    }
                }
                break;
            case 'NGO':
                // Check if NGO record exists
                existingRecord = yield (0, util_1.query)('SELECT * FROM ngos WHERE user_id = $1', [user.id]);
                validationResult = ngoDetailsSchema.safeParse(req.body);
                if (validationResult.success) {
                    const ngoData = validationResult.data;
                    const { ngo_name, mission_statement, contact_person, contact_number, operating_hours, target_demographics, ngo_type, registration_number, registration_certificate, pan_number, pan_card_image, fcra_number, fcra_certificate, tax_exemption_certificate, annual_reports_link } = ngoData;
                    // Check if this is a new entry or substantial update that requires verification
                    if (!existingRecord.rows.length) {
                        verificationNeeded = true;
                        // Insert new record
                        updateQuery = yield (0, util_1.query)(`INSERT INTO ngos (
                user_id, ngo_name, mission_statement, contact_person, contact_number, 
                operating_hours, target_demographics, ngo_type, registration_number, 
                registration_certificate, pan_number, pan_card_image, fcra_number, 
                fcra_certificate, tax_exemption_certificate, annual_reports_link,
                is_verified, created_at, updated_at
              )
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
              RETURNING *`, [
                            user.id, ngo_name, mission_statement, contact_person, contact_number,
                            operating_hours, target_demographics, ngo_type, registration_number,
                            registration_certificate, pan_number, pan_card_image, fcra_number,
                            fcra_certificate, tax_exemption_certificate, annual_reports_link
                        ]);
                    }
                    else {
                        // Check if verification fields have changed
                        const criticalFields = [
                            'registration_number', 'pan_number', 'fcra_number',
                            'registration_certificate', 'pan_card_image', 'fcra_certificate',
                            'tax_exemption_certificate'
                        ];
                        // Type-safe check for changed critical fields
                        const hasChangedCriticalFields = criticalFields.some(field => {
                            const existingValue = existingRecord === null || existingRecord === void 0 ? void 0 : existingRecord.rows[0][field];
                            const newValue = ngoData[field];
                            return existingValue !== newValue;
                        });
                        // If critical verification fields have changed, set verification status to false
                        verificationNeeded = hasChangedCriticalFields;
                        // Update existing record
                        updateQuery = yield (0, util_1.query)(`UPDATE ngos 
              SET ngo_name = $2, mission_statement = $3, contact_person = $4,
                  contact_number = $5, operating_hours = $6, target_demographics = $7,
                  ngo_type = $8, registration_number = $9, registration_certificate = $10,
                  pan_number = $11, pan_card_image = $12, fcra_number = $13,
                  fcra_certificate = $14, tax_exemption_certificate = $15,
                  annual_reports_link = $16, is_verified = $17, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $1
              RETURNING *`, [
                            user.id, ngo_name, mission_statement, contact_person, contact_number,
                            operating_hours, target_demographics, ngo_type, registration_number,
                            registration_certificate, pan_number, pan_card_image, fcra_number,
                            fcra_certificate, tax_exemption_certificate, annual_reports_link,
                            // If critical fields changed, set to false, otherwise keep existing status
                            hasChangedCriticalFields ? false : existingRecord.rows[0].is_verified
                        ]);
                    }
                }
                break;
            case 'RECIPIENT':
                // Check if recipient record exists
                existingRecord = yield (0, util_1.query)('SELECT * FROM recipients WHERE user_id = $1', [user.id]);
                validationResult = recipientDetailsSchema.safeParse(req.body);
                if (validationResult.success) {
                    const recipientData = validationResult.data;
                    const { recipient_name, recipient_details, contact_person, contact_number, id_type, id_number, id_image, address, proof_of_need } = recipientData;
                    // Check if this is a new entry or update that requires verification
                    if (!existingRecord.rows.length) {
                        verificationNeeded = true;
                        // Insert new record
                        updateQuery = yield (0, util_1.query)(`INSERT INTO recipients (
                user_id, recipient_name, recipient_details, contact_person, contact_number,
                id_type, id_number, id_image, address, proof_of_need, is_verified,
                created_at, updated_at
              )
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
              RETURNING *`, [
                            user.id, recipient_name, recipient_details, contact_person, contact_number,
                            id_type, id_number, id_image, address, proof_of_need
                        ]);
                    }
                    else {
                        // Check if verification fields have changed
                        const criticalFields = ['id_type', 'id_number', 'id_image', 'proof_of_need'];
                        // Type-safe check for changed critical fields
                        const hasChangedCriticalFields = criticalFields.some(field => {
                            const existingValue = existingRecord === null || existingRecord === void 0 ? void 0 : existingRecord.rows[0][field];
                            const newValue = recipientData[field];
                            return existingValue !== newValue;
                        });
                        // If critical verification fields have changed, set verification status to false
                        verificationNeeded = hasChangedCriticalFields;
                        // Update existing record
                        updateQuery = yield (0, util_1.query)(`UPDATE recipients 
              SET recipient_name = $2, recipient_details = $3, contact_person = $4, 
                  contact_number = $5, id_type = $6, id_number = $7, id_image = $8,
                  address = $9, proof_of_need = $10, is_verified = $11,
                  updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $1
              RETURNING *`, [
                            user.id, recipient_name, recipient_details, contact_person, contact_number,
                            id_type, id_number, id_image, address, proof_of_need,
                            // If critical fields changed, set to false, otherwise keep existing status
                            hasChangedCriticalFields ? false : existingRecord.rows[0].is_verified
                        ]);
                    }
                }
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user role'
                });
        }
        if (!validationResult || !validationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: validationResult ? validationResult.error.errors : 'Validation failed'
            });
        }
        // If verification is needed, send an email to admin
        if (verificationNeeded && (user.role.toUpperCase() === 'NGO' || user.role.toUpperCase() === 'RECIPIENT')) {
            // Get admin emails
            const adminQuery = yield (0, util_1.query)('SELECT email FROM users WHERE role = $1', ['ADMIN']);
            if (adminQuery.rows.length > 0) {
                const adminEmails = adminQuery.rows.map(row => row.email).join(',');
                const userQuery = yield (0, util_1.query)('SELECT username, email FROM users WHERE id = $1', [user.id]);
                const username = userQuery.rows[0].username;
                const userEmail = userQuery.rows[0].email;
                const roleType = user.role.toUpperCase();
                // Create verification log
                yield (0, util_1.query)(`INSERT INTO verification_logs (
            entity_type, entity_id, status, verification_notes, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
                    roleType,
                    updateQuery.rows[0].id,
                    'PENDING',
                    `New ${roleType.toLowerCase()} registration/update requiring verification`
                ]);
                // Send notification email to admin
                const subject = `Food Donation App - New ${roleType} Verification Required`;
                const text = `Hello Admin,\n\nA new ${roleType.toLowerCase()} account or profile update requires your verification.\n\nUser: ${username}\nEmail: ${userEmail}\n\nPlease log in to the admin dashboard to review and verify this account.\n\nRegards,\nFood Donation App Team`;
                const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e53e3e; border-bottom: 1px solid #e53e3e; padding-bottom: 10px;">New ${roleType} Verification Required</h2>
            <p>Hello Admin,</p>
            <p>A new ${roleType.toLowerCase()} account or profile update requires your verification.</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User:</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Role:</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${roleType}</td>
              </tr>
            </table>
            <p>Please log in to the admin dashboard to review and verify this account.</p>
            <p>Regards,<br>Food Donation App Team</p>
          </div>
        `;
                // Send email to admin(s)
                yield sendEmail(adminEmails, subject, text, html);
                // Send notification to user
                const userSubject = `Food Donation App - Your ${roleType} Account Verification`;
                const userText = `Hello ${username},\n\nThank you for providing your ${roleType.toLowerCase()} details. Your information has been submitted for verification. You will be notified once the verification is complete.\n\nPlease note that you won't be able to place orders until your account is verified by our team.\n\nRegards,\nFood Donation App Team`;
                const userHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3182ce; border-bottom: 1px solid #3182ce; padding-bottom: 10px;">Account Verification in Progress</h2>
            <p>Hello ${username},</p>
            <p>Thank you for providing your ${roleType.toLowerCase()} details. Your information has been submitted for verification.</p>
            <p>You will be notified once the verification is complete.</p>
            <p><strong>Please note:</strong> You won't be able to place orders until your account is verified by our team.</p>
            <p>Regards,<br>Food Donation App Team</p>
          </div>
        `;
                // Send email to user
                yield sendEmail(userEmail, userSubject, userText, userHtml);
            }
        }
        return res.status(200).json({
            success: true,
            message: 'Role details updated successfully',
            details: updateQuery === null || updateQuery === void 0 ? void 0 : updateQuery.rows[0],
            verification_required: verificationNeeded
        });
    }
    catch (error) {
        console.error('Error updating role details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update role details',
        });
    }
}));
router.get('/verification-status', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id) || !(user === null || user === void 0 ? void 0 : user.role)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // For donors, they're automatically verified (no approval needed)
        if (user.role.toUpperCase() === 'DONOR') {
            return res.status(200).json({
                success: true,
                status: {
                    is_verified: true,
                    can_place_orders: true,
                    verification_date: null,
                    message: 'Donor accounts are pre-verified and can place orders immediately.'
                }
            });
        }
        if (user.role.toUpperCase() !== 'NGO' && user.role.toUpperCase() !== 'RECIPIENT') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user role or role does not require verification'
            });
        }
        const table = user.role.toLowerCase() + 's';
        const verificationQuery = yield (0, util_1.query)(`SELECT is_verified, can_place_orders, verification_date FROM ${table} WHERE user_id = $1`, [user.id]);
        if (!verificationQuery.rows.length) {
            return res.status(200).json({
                success: true,
                status: {
                    is_verified: false,
                    can_place_orders: false,
                    verification_date: null,
                    message: 'Account details not found or incomplete. Please complete your profile.'
                }
            });
        }
        const verificationStatus = verificationQuery.rows[0];
        // Get the most recent verification log
        const logQuery = yield (0, util_1.query)(`SELECT * FROM verification_logs 
       WHERE entity_type = $1 AND entity_id = (
         SELECT id FROM ${table} WHERE user_id = $2
       )
       ORDER BY created_at DESC
       LIMIT 1`, [user.role.toUpperCase(), user.id]);
        let message = '';
        if (verificationStatus.is_verified) {
            message = 'Your account has been verified.';
            if (verificationStatus.can_place_orders) {
                message += ' You can now place orders.';
            }
            else {
                message += ' You will be able to place orders soon.';
            }
        }
        else {
            message = 'Your account is pending verification. This usually takes 1-2 business days.';
        }
        return res.status(200).json({
            success: true,
            status: {
                is_verified: verificationStatus.is_verified,
                can_place_orders: verificationStatus.can_place_orders,
                verification_date: verificationStatus.verification_date,
                message,
                latest_log: logQuery.rows.length > 0 ? logQuery.rows[0] : null
            }
        });
    }
    catch (error) {
        console.error('Error checking verification status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check verification status'
        });
    }
}));
// Calculate profile completion percentage
router.get('/completion', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id) || !(user === null || user === void 0 ? void 0 : user.role)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const userQuery = yield (0, util_1.query)('SELECT * FROM users WHERE id = $1', [user.id]);
        let roleQuery;
        switch (user.role.toUpperCase()) {
            case 'DONOR':
                roleQuery = yield (0, util_1.query)('SELECT * FROM donors WHERE user_id = $1', [user.id]);
                break;
            case 'NGO':
                roleQuery = yield (0, util_1.query)('SELECT * FROM ngos WHERE user_id = $1', [user.id]);
                break;
            case 'RECIPIENT':
                roleQuery = yield (0, util_1.query)('SELECT * FROM recipients WHERE user_id = $1', [user.id]);
                break;
        }
        const userData = userQuery.rows[0];
        const roleDetails = roleQuery === null || roleQuery === void 0 ? void 0 : roleQuery.rows[0];
        // Calculate completion percentage
        const baseFields = ['username', 'email', 'phone', 'address'].filter(f => userData[f]);
        const baseCompletion = (baseFields.length / 4) * 50;
        let roleCompletion = 0;
        if (roleDetails) {
            // Calculate differently based on role to account for verification fields
            if (user.role.toUpperCase() === 'NGO') {
                // For NGOs, include verification documents in completion calculation
                const requiredFields = [
                    'ngo_name', 'mission_statement', 'contact_person', 'contact_number',
                    'operating_hours', 'target_demographics'
                ];
                const verificationFields = [
                    'ngo_type', 'registration_number', 'registration_certificate',
                    'pan_number', 'pan_card_image'
                ];
                const optionalFields = [
                    'fcra_number', 'fcra_certificate', 'tax_exemption_certificate',
                    'annual_reports_link'
                ];
                const requiredFilled = requiredFields.filter(f => roleDetails[f]).length;
                const verificationFilled = verificationFields.filter(f => roleDetails[f]).length;
                const optionalFilled = optionalFields.filter(f => roleDetails[f]).length;
                // Calculate weighted completion
                const requiredWeight = 25; // 25% for required fields
                const verificationWeight = 20; // 20% for verification fields
                const optionalWeight = 5; // 5% for optional fields
                roleCompletion =
                    (requiredFilled / requiredFields.length) * requiredWeight +
                        (verificationFilled / verificationFields.length) * verificationWeight +
                        (optionalFilled / optionalFields.length) * optionalWeight;
            }
            else if (user.role.toUpperCase() === 'RECIPIENT') {
                // For recipients, include verification documents in completion calculation
                const requiredFields = [
                    'recipient_name', 'recipient_details', 'contact_person', 'contact_number'
                ];
                const verificationFields = [
                    'id_type', 'id_number', 'id_image', 'address', 'proof_of_need'
                ];
                const requiredFilled = requiredFields.filter(f => roleDetails[f]).length;
                const verificationFilled = verificationFields.filter(f => roleDetails[f]).length;
                // Calculate weighted completion
                const requiredWeight = 25; // 25% for required fields
                const verificationWeight = 25; // 25% for verification fields
                roleCompletion =
                    (requiredFilled / requiredFields.length) * requiredWeight +
                        (verificationFilled / verificationFields.length) * verificationWeight;
            }
            else {
                // For donors, use the original calculation
                const totalRoleFields = Object.keys(roleDetails).length - 1; // Exclude user_id
                const filledRoleFields = Object.entries(roleDetails)
                    .filter(([key, value]) => key !== 'user_id' && value)
                    .length;
                roleCompletion = (filledRoleFields / totalRoleFields) * 50;
            }
        }
        return res.status(200).json({
            success: true,
            completion: Math.round(baseCompletion + roleCompletion)
        });
    }
    catch (error) {
        console.error('Error calculating profile completion:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate profile completion'
        });
    }
}));
router.post('/upload-profile-picture', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { image, fileType } = req.body;
        if (!image || !fileType) {
            return res.status(400).json({
                success: false,
                message: 'Missing image data or file type'
            });
        }
        // Use S3Service to upload the image
        const uploadResult = yield s3Service_1.default.uploadProfilePicture(user.id.toString(), image, fileType);
        // Update the user's profile_picture in the database
        yield (0, util_1.query)('UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [uploadResult.url, user.id]);
        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            imageUrl: uploadResult.url,
            storageType: uploadResult.storageType
        });
    }
    catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture',
        });
    }
}));
router.post('/upload-document', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { document, fileType, documentType } = req.body;
        if (!(user === null || user === void 0 ? void 0 : user.id) || !(user === null || user === void 0 ? void 0 : user.role)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Validate request
        if (!document || !fileType || !documentType) {
            return res.status(400).json({
                success: false,
                message: 'Document, fileType and documentType are required'
            });
        }
        // Check if the user's role requires verification
        if (user.role.toUpperCase() !== 'NGO' && user.role.toUpperCase() !== 'RECIPIENT') {
            return res.status(403).json({
                success: false,
                message: 'Only NGO and RECIPIENT roles can upload verification documents'
            });
        }
        // Upload to S3
        const folder = user.role.toLowerCase() + 's';
        const uploadResult = yield s3Service_1.default.uploadDocument(folder, user.id.toString(), documentType, document, fileType);
        // Update the document URL in the database
        let updateField = '';
        if (user.role.toUpperCase() === 'NGO') {
            if (documentType === 'registration_certificate')
                updateField = 'registration_certificate';
            else if (documentType === 'pan_card_image')
                updateField = 'pan_card_image';
            else if (documentType === 'fcra_certificate')
                updateField = 'fcra_certificate';
            else if (documentType === 'tax_exemption_certificate')
                updateField = 'tax_exemption_certificate';
        }
        else if (user.role.toUpperCase() === 'RECIPIENT') {
            if (documentType === 'id_image')
                updateField = 'id_image';
            else if (documentType === 'proof_of_need')
                updateField = 'proof_of_need';
        }
        if (!updateField) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document type for this role'
            });
        }
        // Update the role-specific table with the document URL
        const table = user.role.toLowerCase() + 's';
        const updateQuery = `UPDATE ${table} SET ${updateField} = $1, is_verified = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *`;
        const updateResult = yield (0, util_1.query)(updateQuery, [uploadResult.url, user.id]);
        if (!updateResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: `${user.role} record not found. Please complete your profile first.`
            });
        }
        // Get user information for email notification
        const userQuery = yield (0, util_1.query)('SELECT username, email FROM users WHERE id = $1', [user.id]);
        if (!userQuery.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const username = userQuery.rows[0].username;
        const userEmail = userQuery.rows[0].email;
        // Create verification log entry
        const logResult = yield (0, util_1.query)(`INSERT INTO verification_logs (
        entity_type, entity_id, status, verification_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`, [
            user.role.toUpperCase(),
            updateResult.rows[0].id,
            'PENDING',
            `Document uploaded: ${documentType} for verification`
        ]);
        // Get admin emails
        const adminQuery = yield (0, util_1.query)('SELECT email FROM users WHERE role = $1', ['ADMIN']);
        let adminEmail = process.env.ADMIN_EMAIL || '20je0209@cve.iitism.ac.in';
        if (adminQuery.rows.length > 0) {
            adminEmail = adminQuery.rows.map(row => row.email).join(',');
        }
        // Generate verification tokens for approve/reject actions
        const approveToken = yield generateVerificationToken(user.role.toUpperCase(), updateResult.rows[0].id, user.id);
        // API base URL
        const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
        // Direct links for document viewing
        const documentViewUrl = uploadResult.url;
        // Verification action URLs
        const approveUrl = `${apiUrl}/profile/verify-document?token=${approveToken}&action=approve&logId=${logResult.rows[0].id}`;
        const rejectUrl = `${apiUrl}/profile/verify-document?token=${approveToken}&action=reject&logId=${logResult.rows[0].id}`;
        // Send notification email to admin with viewing and action links
        const adminSubject = `Food Donation App - New ${user.role} Document Upload Requires Verification`;
        const adminText = `
      Hello Admin,
      
      A user has uploaded a new document that requires verification.
      
      User: ${username}
      Email: ${userEmail}
      Role: ${user.role}
      Document Type: ${documentType}
      
      View Document: ${documentViewUrl}
      
      To approve this document, click here: ${approveUrl}
      To reject this document, click here: ${rejectUrl}
      
      Regards,
      Food Donation App Team
    `;
        const adminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e; border-bottom: 1px solid #e53e3e; padding-bottom: 10px;">New Document Upload Requires Verification</h2>
        <p>Hello Admin,</p>
        <p>A user has uploaded a new document that requires verification.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">User:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${username}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Role:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${user.role}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">Document Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${documentType}</td>
          </tr>
        </table>
        
        <div style="margin: 20px 0;">
          <p><strong>Document:</strong></p>
          <p><a href="${documentViewUrl}" target="_blank" style="color: #3182ce;">View Document</a></p>
        </div>
        
        <div style="display: flex; gap: 10px; margin: 30px 0;">
          <a href="${approveUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; text-align: center; min-width: 120px;">Approve</a>
          <a href="${rejectUrl}" style="display: inline-block; background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; text-align: center; min-width: 120px;">Reject</a>
        </div>
        
        <p>Regards,<br>Food Donation App Team</p>
      </div>
    `;
        yield sendEmail(adminEmail, adminSubject, adminText, adminHtml);
        return res.status(200).json({
            success: true,
            message: 'Document uploaded successfully and admin notified for verification via email',
            documentUrl: uploadResult.url,
            storageType: uploadResult.storageType || 's3'
        });
    }
    catch (error) {
        console.error('Error uploading document:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload document: ' + (error instanceof Error ? error.message : 'Unknown error')
        });
    }
}));
router.get('/verify-document', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, action, logId } = req.query;
        if (!token || !action || !logId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }
        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }
        // Verify token
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (payload.purpose !== 'verification') {
            return res.status(401).json({
                success: false,
                message: 'Invalid verification token'
            });
        }
        // Get entity details
        const entityType = payload.entityType; // 'NGO' or 'RECIPIENT'
        const entityId = payload.entityId;
        const userId = payload.userId;
        // Check if log exists
        const logQuery = yield (0, util_1.query)('SELECT * FROM verification_logs WHERE id = $1', [logId]);
        if (!logQuery.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Verification record not found'
            });
        }
        // Update entity verification status
        const table = entityType.toLowerCase() + 's';
        const isApproved = action === 'approve';
        const updateResult = yield (0, util_1.query)(`UPDATE ${table} 
       SET is_verified = $1, can_place_orders = $1, verification_date = NOW() 
       WHERE id = $2 RETURNING *`, [isApproved, entityId]);
        if (!updateResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Entity not found'
            });
        }
        // Update log status
        yield (0, util_1.query)(`UPDATE verification_logs 
       SET status = $1, verification_notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`, [
            isApproved ? 'APPROVED' : 'REJECTED',
            isApproved ? 'Approved via email verification' : 'Rejected via email verification',
            logId
        ]);
        // Get user information
        const userQuery = yield (0, util_1.query)('SELECT username, email FROM users WHERE id = $1', [userId]);
        if (!userQuery.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const username = userQuery.rows[0].username;
        const userEmail = userQuery.rows[0].email;
        // Send notification email to the user about their verification status
        const appName = 'Food Donation App';
        const emailSubject = isApproved ?
            `${appName} - Your Account Has Been Verified` :
            `${appName} - Account Verification Update`;
        const emailText = isApproved ?
            `Hello ${username},\n\nGreat news! Your account has been verified. You can now place orders and fully use the ${appName}.\n\nThank you for your patience during the verification process.\n\nRegards,\n${appName} Team` :
            `Hello ${username},\n\nWe've reviewed your account verification documents. Unfortunately, we couldn't approve your verification at this time.\n\nPlease update your information and try again.\n\nIf you have any questions, please contact our support team.\n\nRegards,\n${appName} Team`;
        const emailHtml = isApproved ?
            `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50; border-bottom: 1px solid #4CAF50; padding-bottom: 10px;">Your Account Has Been Verified!</h2>
        <p>Hello ${username},</p>
        <p>Great news! Your account has been verified. You can now place orders and fully use the ${appName}.</p>
        <p>Thank you for your patience during the verification process.</p>
        <p>Regards,<br>${appName} Team</p>
      </div>` :
            `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336; border-bottom: 1px solid #f44336; padding-bottom: 10px;">Account Verification Update</h2>
        <p>Hello ${username},</p>
        <p>We've reviewed your account verification documents. Unfortunately, we couldn't approve your verification at this time.</p>
        <p>Please update your information and try again.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Regards,<br>${appName} Team</p>
      </div>`;
        yield sendEmail(userEmail, emailSubject, emailText, emailHtml);
        // Return a success page
        const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification ${isApproved ? 'Approved' : 'Rejected'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            text-align: center;
          }
          .container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: ${isApproved ? '#4CAF50' : '#f44336'};
          }
          .message {
            font-size: 18px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification ${isApproved ? 'Approved' : 'Rejected'}</h1>
          <div class="message">
            You have successfully ${isApproved ? 'approved' : 'rejected'} the verification request.
          </div>
          <p>The user has been notified via email about this decision.</p>
        </div>
      </body>
      </html>
    `;
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlResponse);
    }
    catch (error) {
        console.error('Error in document verification:', error);
        // Return an error page
        const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            text-align: center;
          }
          .container {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #f44336;
          }
          .message {
            font-size: 18px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Error</h1>
          <div class="message">
            There was an error processing this verification request.
          </div>
          <p>The verification link may be invalid or expired.</p>
        </div>
      </body>
      </html>
    `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(htmlResponse);
    }
}));
router.post('/admin-verify', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { userId, approved, notes } = req.body;
        // Check if user is an admin
        if (user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can verify users'
            });
        }
        // Validate required fields
        if (!userId || approved === undefined) {
            return res.status(400).json({
                success: false,
                message: 'userId and approved status are required'
            });
        }
        // Get the user to verify
        const userToVerify = yield (0, util_1.query)('SELECT * FROM users WHERE id = $1', [userId]);
        if (!userToVerify.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const userRole = userToVerify.rows[0].role;
        const userEmail = userToVerify.rows[0].email;
        const username = userToVerify.rows[0].username;
        let updateResult;
        // Check if the role requires verification
        if (userRole !== 'NGO' && userRole !== 'RECIPIENT') {
            return res.status(400).json({
                success: false,
                message: 'Only NGO and RECIPIENT roles require verification'
            });
        }
        // Update verification status based on role
        const table = userRole.toLowerCase() + 's';
        updateResult = yield (0, util_1.query)(`UPDATE ${table} SET is_verified = $1, can_place_orders = $1, verification_date = NOW() WHERE user_id = $2 RETURNING *`, [approved, userId]);
        if (!updateResult.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Role details not found'
            });
        }
        // Create verification log
        yield (0, util_1.query)(`INSERT INTO verification_logs (
        entity_type, entity_id, status, verification_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
            userRole.toUpperCase(),
            updateResult.rows[0].id,
            approved ? 'APPROVED' : 'REJECTED',
            notes || (approved ? 'Account verified by admin' : 'Account verification rejected by admin')
        ]);
        // Send email notification to the user
        const appName = 'Food Donation App';
        const emailSubject = approved ?
            `${appName} - Your Account Has Been Verified` :
            `${appName} - Account Verification Update`;
        const emailText = approved ?
            `Hello ${username},\n\nGreat news! Your account has been verified. You can now place orders and fully use the ${appName}.\n\nThank you for your patience during the verification process.\n\nRegards,\n${appName} Team` :
            `Hello ${username},\n\nWe've reviewed your account verification documents. Unfortunately, we couldn't approve your verification at this time.\n\n${notes || 'Please update your information and try again.'}\n\nIf you have any questions, please contact our support team.\n\nRegards,\n${appName} Team`;
        const emailHtml = approved ?
            `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50; border-bottom: 1px solid #4CAF50; padding-bottom: 10px;">Your Account Has Been Verified!</h2>
        <p>Hello ${username},</p>
        <p>Great news! Your account has been verified. You can now place orders and fully use the ${appName}.</p>
        <p>Thank you for your patience during the verification process.</p>
        <p>Regards,<br>${appName} Team</p>
      </div>` :
            `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336; border-bottom: 1px solid #f44336; padding-bottom: 10px;">Account Verification Update</h2>
        <p>Hello ${username},</p>
        <p>We've reviewed your account verification documents. Unfortunately, we couldn't approve your verification at this time.</p>
        <p>${notes || 'Please update your information and try again.'}</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Regards,<br>${appName} Team</p>
      </div>`;
        yield sendEmail(userEmail, emailSubject, emailText, emailHtml);
        return res.status(200).json({
            success: true,
            message: `User ${userId} ${approved ? 'approved' : 'rejected'} successfully`,
            details: updateResult.rows[0]
        });
    }
    catch (error) {
        console.error('Error verifying user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify user: ' + (error instanceof Error ? error.message : 'Unknown error')
        });
    }
}));
function generateVerificationToken(entityType, entityId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create a JWT token that will be used for verification links in emails
        const token = jsonwebtoken_1.default.sign({
            entityType,
            entityId,
            userId,
            purpose: 'verification'
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' } // Token expires in 7 days
        );
        return token;
    });
}
// Shared function to handle sending verification OTP
function handleSendVerificationOtp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = req.user;
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { type, newValue, contactMethod } = req.body;
            if (!type || !newValue) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: type and new value'
                });
            }
            if (!['email', 'phone'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type. Must be "email" or "phone"'
                });
            }
            if (!['email', 'phone'].includes(contactMethod || type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid contact method. Must be "email" or "phone"'
                });
            }
            // Check if new value is already taken
            if (type === 'email') {
                const existingUser = yield (0, util_1.query)('SELECT id FROM users WHERE email = $1 AND id != $2', [newValue, user.id]);
                if (existingUser.rows.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already taken'
                    });
                }
            }
            else if (type === 'phone') {
                const existingUser = yield (0, util_1.query)('SELECT id FROM users WHERE phone = $1 AND id != $2', [newValue, user.id]);
                if (existingUser.rows.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Phone number already taken'
                    });
                }
            }
            // Get current user info
            const currentUser = yield (0, util_1.query)('SELECT email, phone, username FROM users WHERE id = $1', [user.id]);
            const currentEmail = currentUser.rows[0].email;
            const currentPhone = currentUser.rows[0].phone;
            const username = currentUser.rows[0].username;
            // Generate OTP
            const otp = optService_1.default.generateOtp();
            // Store OTP with target value in Redis
            yield redisClient_1.default.set(`${type}_change:${user.id}`, JSON.stringify({
                otp,
                newValue,
                contactMethod
            }), { EX: 300 }); // 5 minutes expiry
            // Send OTP based on preferred contact method
            if (contactMethod === 'email' && currentEmail) {
                // Create email content
                const subject = `Food Donation App - ${type === 'email' ? 'Email' : 'Phone Number'} Change Verification`;
                const text = `Hello ${username},\n\nYour verification code to change your ${type === 'email' ? 'email to' : 'phone number to'} ${newValue} is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this change, please ignore this email.\n\nRegards,\nFood Donation App Team`;
                const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e; border-bottom: 1px solid #e53e3e; padding-bottom: 10px;">${type === 'email' ? 'Email' : 'Phone Number'} Change Verification</h2>
          <p>Hello ${username},</p>
          <p>We received a request to change your ${type === 'email' ? 'email address' : 'phone number'}.</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
            ${otp}
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you did not request this change, please ignore this email.</p>
          <p>Regards,<br>Food Donation App Team</p>
        </div>
      `;
                // Send OTP via email
                yield sendEmail(currentEmail, subject, text, html);
                return res.status(200).json({
                    success: true,
                    message: `OTP sent successfully to your email`
                });
            }
            else if (contactMethod === 'phone' && currentPhone) {
                // Send OTP via Twilio
                yield optService_1.default.sendOtp(currentPhone, otp);
                return res.status(200).json({
                    success: true,
                    message: `OTP sent successfully to your phone number`
                });
            }
            else {
                // Fallback to whatever is available
                if (currentEmail) {
                    const subject = `Food Donation App - ${type === 'email' ? 'Email' : 'Phone Number'} Change Verification`;
                    const text = `Hello ${username},\n\nYour verification code to change your ${type === 'email' ? 'email to' : 'phone number to'} ${newValue} is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this change, please ignore this email.\n\nRegards,\nFood Donation App Team`;
                    const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e53e3e; border-bottom: 1px solid #e53e3e; padding-bottom: 10px;">${type === 'email' ? 'Email' : 'Phone Number'} Change Verification</h2>
            <p>Hello ${username},</p>
            <p>We received a request to change your ${type === 'email' ? 'email address' : 'phone number'}.</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this change, please ignore this email.</p>
            <p>Regards,<br>Food Donation App Team</p>
          </div>
        `;
                    yield sendEmail(currentEmail, subject, text, html);
                    return res.status(200).json({
                        success: true,
                        message: `OTP sent successfully to your email`
                    });
                }
                else if (currentPhone) {
                    yield optService_1.default.sendOtp(currentPhone, otp);
                    return res.status(200).json({
                        success: true,
                        message: `OTP sent successfully to your phone number`
                    });
                }
                else {
                    return res.status(400).json({
                        success: false,
                        message: 'No valid contact method available'
                    });
                }
            }
        }
        catch (error) {
            console.error('Error sending verification OTP:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP'
            });
        }
    });
}
// Shared function to handle OTP verification
function handleVerifyOtp(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = req.user;
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const { type, otp } = req.body;
            if (!type || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: type and otp'
                });
            }
            if (!['email', 'phone'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type. Must be "email" or "phone"'
                });
            }
            // Get stored OTP data
            const storedData = yield redisClient_1.default.get(`${type}_change:${user.id}`);
            if (!storedData) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP expired or not requested'
                });
            }
            const { otp: storedOtp, newValue, contactMethod } = JSON.parse(storedData);
            if (otp !== storedOtp) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                });
            }
            // Update the specified field
            let updateQuery;
            if (type === 'email') {
                updateQuery = yield (0, util_1.query)(`UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING email, username`, [newValue, user.id]);
            }
            else { // type === 'phone'
                updateQuery = yield (0, util_1.query)(`UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING phone, email, username`, [newValue, user.id]);
            }
            // Delete OTP from Redis
            yield redisClient_1.default.del(`${type}_change:${user.id}`);
            const email = type === 'email' ? newValue : updateQuery.rows[0].email;
            const username = updateQuery.rows[0].username;
            // Send confirmation email
            const subject = `Food Donation App - ${type === 'email' ? 'Email' : 'Phone Number'} Changed Successfully`;
            const text = `Hello ${username},\n\nYour ${type === 'email' ? 'email' : 'phone number'} has been successfully changed to ${newValue}.\n\nIf you did not make this change, please contact our support team immediately.\n\nRegards,\nFood Donation App Team`;
            const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #38a169; border-bottom: 1px solid #38a169; padding-bottom: 10px;">${type === 'email' ? 'Email' : 'Phone Number'} Changed Successfully</h2>
        <p>Hello ${username},</p>
        <p>Your ${type === 'email' ? 'email' : 'phone number'} has been successfully changed to <strong>${newValue}</strong>.</p>
        <p>If you did not make this change, please contact our support team immediately.</p>
        <p>Regards,<br>Food Donation App Team</p>
      </div>
    `;
            // Send confirmation email
            yield sendEmail(email, subject, text, html);
            return res.status(200).json({
                success: true,
                message: `${type === 'email' ? 'Email' : 'Phone number'} updated successfully`,
                [type]: newValue
            });
        }
        catch (error) {
            console.error(`Error verifying ${req.body.type} OTP:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify OTP'
            });
        }
    });
}
// Route to send OTP for verification
router.post('/send-verification-otp', auth_1.authMiddleware, handleSendVerificationOtp);
// Route to verify OTP and update user field
router.post('/verify-otp', auth_1.authMiddleware, handleVerifyOtp);
// For backwards compatibility - redirect to new endpoints
router.post('/send-email-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        req.body.type = 'email';
        req.body.newValue = req.body.newEmail;
        req.body.contactMethod = 'email';
        return yield handleSendVerificationOtp(req, res);
    }
    catch (error) {
        console.error('Error in legacy endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
}));
router.post('/send-phone-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        req.body.type = 'phone';
        req.body.newValue = req.body.newPhone;
        req.body.contactMethod = req.body.contactMethod || 'email';
        return yield handleSendVerificationOtp(req, res);
    }
    catch (error) {
        console.error('Error in legacy endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
}));
router.post('/verify-email-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        req.body.type = 'email';
        return yield handleVerifyOtp(req, res);
    }
    catch (error) {
        console.error('Error in legacy endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
}));
router.post('/verify-phone-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        req.body.type = 'phone';
        return yield handleVerifyOtp(req, res);
    }
    catch (error) {
        console.error('Error in legacy endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
}));
// Add these new routes to the profile.ts
// Route to send OTP to new email
router.post('/send-new-email-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { newEmail } = req.body;
        if (!newEmail) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: newEmail'
            });
        }
        // Check if email is already taken
        const existingUser = yield (0, util_1.query)('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, user.id]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email already taken'
            });
        }
        // Generate OTP
        const otp = optService_1.default.generateOtp();
        // Store OTP with target value in Redis
        yield redisClient_1.default.set(`new_email_verification:${user.id}`, JSON.stringify({
            otp,
            newEmail
        }), { EX: 300 }); // 5 minutes expiry
        // Send OTP directly to the new email
        const username = (yield (0, util_1.query)('SELECT username FROM users WHERE id = $1', [user.id])).rows[0].username;
        const subject = 'Food Donation App - New Email Verification';
        const text = `Hello,\n\nYour verification code to verify this new email address is: ${otp}\n\nThis code will expire in 5 minutes.\n\nRegards,\nFood Donation App Team`;
        const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e; border-bottom: 1px solid #e53e3e; padding-bottom: 10px;">New Email Verification</h2>
        <p>Hello,</p>
        <p>We received a request to set this as your new email address for the Food Donation App.</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you did not request this change, please ignore this email.</p>
        <p>Regards,<br>Food Donation App Team</p>
      </div>
    `;
        // Send OTP via email to the NEW email
        yield sendEmail(newEmail, subject, text, html);
        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to the new email address`
        });
    }
    catch (error) {
        console.error('Error sending new email OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
}));
// Route to send OTP to new phone
router.post('/send-new-phone-otp', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { newPhone } = req.body;
        if (!newPhone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: newPhone'
            });
        }
        // Check if phone is already taken
        const existingUser = yield (0, util_1.query)('SELECT id FROM users WHERE phone = $1 AND id != $2', [newPhone, user.id]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Phone number already taken'
            });
        }
        // Generate OTP
        const otp = optService_1.default.generateOtp();
        // Store OTP with target value in Redis
        yield redisClient_1.default.set(`new_phone_verification:${user.id}`, JSON.stringify({
            otp,
            newPhone
        }), { EX: 300 }); // 5 minutes expiry
        // Send OTP directly to the new phone number using Twilio
        yield optService_1.default.sendOtp(newPhone, otp);
        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to the new phone number`
        });
    }
    catch (error) {
        console.error('Error sending new phone OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send OTP'
        });
    }
}));
// Route to verify new email OTP
router.post('/verify-new-email', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { otp, newEmail } = req.body;
        if (!otp || !newEmail) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: otp and newEmail'
            });
        }
        // Get stored OTP data
        const storedData = yield redisClient_1.default.get(`new_email_verification:${user.id}`);
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not requested'
            });
        }
        const { otp: storedOtp, newEmail: storedEmail } = JSON.parse(storedData);
        if (otp !== storedOtp || newEmail !== storedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP or email mismatch'
            });
        }
        // Update user's email
        const updateQuery = yield (0, util_1.query)(`UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING email, username`, [newEmail, user.id]);
        // Delete OTP from Redis
        yield redisClient_1.default.del(`new_email_verification:${user.id}`);
        const username = updateQuery.rows[0].username;
        // Send confirmation email to the new email
        const subject = 'Food Donation App - Email Changed Successfully';
        const text = `Hello ${username},\n\nYour email has been successfully changed to ${newEmail}.\n\nIf you did not make this change, please contact our support team immediately.\n\nRegards,\nFood Donation App Team`;
        const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #38a169; border-bottom: 1px solid #38a169; padding-bottom: 10px;">Email Changed Successfully</h2>
        <p>Hello ${username},</p>
        <p>Your email has been successfully changed to <strong>${newEmail}</strong>.</p>
        <p>If you did not make this change, please contact our support team immediately.</p>
        <p>Regards,<br>Food Donation App Team</p>
      </div>
    `;
        // Send confirmation email
        yield sendEmail(newEmail, subject, text, html);
        return res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            email: newEmail
        });
    }
    catch (error) {
        console.error('Error verifying new email OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
}));
// Route to verify new phone OTP
router.post('/verify-new-phone', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { otp, newPhone } = req.body;
        if (!otp || !newPhone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: otp and newPhone'
            });
        }
        // Get stored OTP data
        const storedData = yield redisClient_1.default.get(`new_phone_verification:${user.id}`);
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or not requested'
            });
        }
        const { otp: storedOtp, newPhone: storedPhone } = JSON.parse(storedData);
        if (otp !== storedOtp || newPhone !== storedPhone) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP or phone mismatch'
            });
        }
        // Update user's phone
        const updateQuery = yield (0, util_1.query)(`UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING phone, email, username`, [newPhone, user.id]);
        // Delete OTP from Redis
        yield redisClient_1.default.del(`new_phone_verification:${user.id}`);
        const email = updateQuery.rows[0].email;
        const username = updateQuery.rows[0].username;
        // Send confirmation email
        if (email) {
            const subject = 'Food Donation App - Phone Number Changed Successfully';
            const text = `Hello ${username},\n\nYour phone number has been successfully changed to ${newPhone}.\n\nIf you did not make this change, please contact our support team immediately.\n\nRegards,\nFood Donation App Team`;
            const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #38a169; border-bottom: 1px solid #38a169; padding-bottom: 10px;">Phone Number Changed Successfully</h2>
          <p>Hello ${username},</p>
          <p>Your phone number has been successfully changed to <strong>${newPhone}</strong>.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <p>Regards,<br>Food Donation App Team</p>
        </div>
      `;
            // Send confirmation email
            yield sendEmail(email, subject, text, html);
        }
        return res.status(200).json({
            success: true,
            message: 'Phone number updated successfully',
            phone: newPhone
        });
    }
    catch (error) {
        console.error('Error verifying new phone OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
}));
exports.default = router;
