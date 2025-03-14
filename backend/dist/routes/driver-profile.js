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
// Validation schema for driver details
const driverDetailsSchema = zod_1.z.object({
    vehicle_type: zod_1.z.string().min(2).max(50),
    vehicle_number: zod_1.z.string().min(3).max(50),
    license_number: zod_1.z.string().min(3).max(50),
    availability_status: zod_1.z.enum(['ONLINE', 'OFFLINE', 'ON_DELIVERY']).optional(),
    service_area: zod_1.z.string().max(255),
    max_delivery_distance: zod_1.z.number().int().positive(),
    address: zod_1.z.string().optional(),
    profile_picture: zod_1.z.string().optional().nullable(),
});
// Get driver profile
router.get('/', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const driverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const driverQuery = yield (0, util_1.query)(`SELECT 
                id, username, email, phone, address, profile_picture, 
                vehicle_type, vehicle_number, license_number, 
                availability_status, service_area, max_delivery_distance,
                rating, total_deliveries, created_at, updated_at 
            FROM drivers WHERE id = $1`, [driverId]);
        if (!driverQuery.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        return res.status(200).json({
            success: true,
            driver: driverQuery.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching driver profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
}));
// Update driver details
router.put('/details', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const driverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const validationResult = driverDetailsSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: validationResult.error.errors
            });
        }
        const { vehicle_type, vehicle_number, license_number, service_area, max_delivery_distance, availability_status, address, profile_picture } = validationResult.data;
        // Update driver record
        const updateQuery = yield (0, util_1.query)(`UPDATE drivers 
            SET vehicle_type = $2, 
                vehicle_number = $3, 
                license_number = $4,
                service_area = $5, 
                max_delivery_distance = $6,
                address = $7,
                profile_picture = $8,
                ${availability_status ? 'availability_status = $9,' : ''}
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *`, availability_status
            ? [driverId, vehicle_type, vehicle_number, license_number, service_area, max_delivery_distance, address, profile_picture, availability_status]
            : [driverId, vehicle_type, vehicle_number, license_number, service_area, max_delivery_distance, address, profile_picture]);
        if (!updateQuery.rowCount) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Driver details updated successfully',
            details: updateQuery.rows[0]
        });
    }
    catch (error) {
        console.error('Error updating driver details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update driver details'
        });
    }
}));
// Update driver location
router.put('/location', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const driverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Invalid location data'
            });
        }
        const updateQuery = yield (0, util_1.query)(`UPDATE drivers 
            SET current_location = point($2, $3),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *`, [driverId, latitude, longitude]);
        if (!updateQuery.rowCount) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            location: updateQuery.rows[0].current_location
        });
    }
    catch (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update location'
        });
    }
}));
// Update availability status
router.put('/status', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const driverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const { status } = req.body;
        if (!['ONLINE', 'OFFLINE', 'ON_DELIVERY'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        const updateQuery = yield (0, util_1.query)(`UPDATE drivers 
            SET availability_status = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *`, [driverId, status]);
        if (!updateQuery.rowCount) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Status updated successfully',
            status: updateQuery.rows[0].availability_status
        });
    }
    catch (error) {
        console.error('Error updating status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
}));
// Calculate profile completion percentage
router.get('/completion', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const driverId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!driverId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const driverQuery = yield (0, util_1.query)('SELECT * FROM drivers WHERE id = $1', [driverId]);
        if (!driverQuery.rows.length) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }
        const driverDetails = driverQuery.rows[0];
        // Calculate completion percentage
        const baseFields = ['username', 'email', 'phone', 'address'].filter(f => driverDetails[f]);
        const baseCompletion = (baseFields.length / 4) * 50;
        const requiredFields = ['vehicle_type', 'vehicle_number', 'license_number', 'service_area', 'max_delivery_distance'];
        const filledFields = requiredFields.filter(field => driverDetails[field]).length;
        const driverCompletion = (filledFields / requiredFields.length) * 50;
        return res.status(200).json({
            success: true,
            completion: Math.round(baseCompletion + driverCompletion)
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
