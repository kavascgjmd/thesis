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
const router = (0, express_1.Router)();
// Configure email transporter
const transporter = nodemailer_1.default.createTransport({
    // For production, use your actual SMTP credentials
    // For development/testing, you can use services like Ethereal, Mailtrap, or a local SMTP server
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
// Validation schemas remain the same
const basicProfileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(255),
    email: zod_1.z.string().email().max(255),
    phone: zod_1.z.string().max(50).optional(),
    address: zod_1.z.string().optional(),
    profile_picture: zod_1.z.string().optional()
});
const donorDetailsSchema = zod_1.z.object({
    donor_type: zod_1.z.enum(['INDIVIDUAL', 'RESTAURANT', 'CORPORATE']),
    organization_name: zod_1.z.string().max(255),
    organization_details: zod_1.z.string().optional(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50),
    operating_hours: zod_1.z.string().max(255)
});
const ngoDetailsSchema = zod_1.z.object({
    ngo_name: zod_1.z.string().max(255),
    mission_statement: zod_1.z.string(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50),
    operating_hours: zod_1.z.string().max(255),
    target_demographics: zod_1.z.string()
});
const recipientDetailsSchema = zod_1.z.object({
    recipient_name: zod_1.z.string().max(255),
    recipient_details: zod_1.z.string(),
    contact_person: zod_1.z.string().max(255),
    contact_number: zod_1.z.string().max(50)
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
// Update basic profile information
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
        const currentUser = yield (0, util_1.query)('SELECT username, email FROM users WHERE id = $1', [user.id]);
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
        let validationResult;
        let updateQuery;
        let existingRecord;
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
               contact_person, contact_number, operating_hours, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
                    const { ngo_name, mission_statement, contact_person, contact_number, operating_hours, target_demographics } = validationResult.data;
                    if (!existingRecord.rows.length) {
                        // Insert new record
                        updateQuery = yield (0, util_1.query)(`INSERT INTO ngos (user_id, ngo_name, mission_statement, contact_person,
               contact_number, operating_hours, target_demographics, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING *`, [user.id, ngo_name, mission_statement, contact_person,
                            contact_number, operating_hours, target_demographics]);
                    }
                    else {
                        // Update existing record
                        updateQuery = yield (0, util_1.query)(`UPDATE ngos 
               SET ngo_name = $2, mission_statement = $3, contact_person = $4,
                   contact_number = $5, operating_hours = $6, target_demographics = $7,
                   updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $1
               RETURNING *`, [user.id, ngo_name, mission_statement, contact_person,
                            contact_number, operating_hours, target_demographics]);
                    }
                }
                break;
            case 'RECIPIENT':
                // Check if recipient record exists
                existingRecord = yield (0, util_1.query)('SELECT * FROM recipients WHERE user_id = $1', [user.id]);
                validationResult = recipientDetailsSchema.safeParse(req.body);
                if (validationResult.success) {
                    const { recipient_name, recipient_details, contact_person, contact_number } = validationResult.data;
                    if (!existingRecord.rows.length) {
                        // Insert new record
                        updateQuery = yield (0, util_1.query)(`INSERT INTO recipients (user_id, recipient_name, recipient_details,
               contact_person, contact_number, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING *`, [user.id, recipient_name, recipient_details,
                            contact_person, contact_number]);
                    }
                    else {
                        // Update existing record
                        updateQuery = yield (0, util_1.query)(`UPDATE recipients 
               SET recipient_name = $2, recipient_details = $3,
                   contact_person = $4, contact_number = $5,
                   updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $1
               RETURNING *`, [user.id, recipient_name, recipient_details,
                            contact_person, contact_number]);
                    }
                }
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user role'
                });
        }
        if (!(validationResult === null || validationResult === void 0 ? void 0 : validationResult.success)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: validationResult === null || validationResult === void 0 ? void 0 : validationResult.error.errors
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Role details updated successfully',
            details: updateQuery === null || updateQuery === void 0 ? void 0 : updateQuery.rows[0]
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
            const totalRoleFields = Object.keys(roleDetails).length - 1; // Exclude user_id
            const filledRoleFields = Object.entries(roleDetails)
                .filter(([key, value]) => key !== 'user_id' && value)
                .length;
            roleCompletion = (filledRoleFields / totalRoleFields) * 50;
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
