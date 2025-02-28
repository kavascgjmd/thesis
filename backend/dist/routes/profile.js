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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const util_1 = require("../db/util");
const router = (0, express_1.Router)();
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
        console.log('kaneki');
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
exports.default = router;
