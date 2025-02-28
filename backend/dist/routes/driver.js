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
const optService_1 = __importDefault(require("../services/optService"));
const rateLimiterMiddleware_1 = __importDefault(require("../middlewares/rateLimiterMiddleware"));
const otp_1 = __importDefault(require("../middlewares/otp"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const redisClient_1 = __importDefault(require("../redisClient"));
const util_1 = require("../db/util");
const router = (0, express_1.Router)();
// Driver validation schema
const driverSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50),
    password: zod_1.z.string().min(8).max(100),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(10).max(15),
    address: zod_1.z.string().optional(),
    profile_picture: zod_1.z.string().optional().nullable(),
    vehicle_type: zod_1.z.string().min(2).max(50),
    vehicle_number: zod_1.z.string().min(3).max(50),
    license_number: zod_1.z.string().min(3).max(50),
    service_area: zod_1.z.string().max(255),
    max_delivery_distance: zod_1.z.number().int().positive(),
});
// Create a function to save temporary driver data
const saveTempDriver = (driverData, phone) => __awaiter(void 0, void 0, void 0, function* () {
    const data = JSON.stringify(driverData);
    yield redisClient_1.default.set(`temp_driver:${phone}`, data, { EX: 300 }); // 5 minutes
});
// Get temporary driver data
const getTempDriver = (phone) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield redisClient_1.default.get(`temp_driver:${phone}`);
    if (!data)
        return null;
    return JSON.parse(data);
});
// Delete temporary driver data
const deleteTempDriver = (phone) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.del(`temp_driver:${phone}`);
});
// Check if driver exists
const checkDriver = (identifier_1, ...args_1) => __awaiter(void 0, [identifier_1, ...args_1], void 0, function* (identifier, password = '') {
    // Check if the identifier is an email or username
    const isEmail = identifier.includes('@');
    const sql = isEmail
        ? 'SELECT * FROM drivers WHERE email = $1'
        : 'SELECT * FROM drivers WHERE username = $1';
    const result = yield (0, util_1.query)(sql, [identifier]);
    if (result.rows.length === 0)
        return null;
    const driver = result.rows[0];
    // If password is provided, validate it
    if (password && !(yield bcrypt_1.default.compare(password, driver.password))) {
        return null;
    }
    return driver;
});
router.post('/signup', rateLimiterMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validationResult = driverSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data',
                errors: validationResult.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        const driverData = validationResult.data;
        // Check for existing driver
        const existingDriver = yield (0, util_1.query)('SELECT * FROM drivers WHERE username = $1 OR email = $2', [driverData.username, driverData.email]);
        if (existingDriver.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Username or email already exists'
            });
        }
        // Save temp driver and send OTP
        yield saveTempDriver(driverData, driverData.phone);
        const otp = optService_1.default.generateOtp();
        yield optService_1.default.sendOtp(driverData.phone, otp);
        return res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully. Please verify to complete signup.',
            data: {
                phone: driverData.phone,
                expiresIn: '5 minutes'
            }
        });
    }
    catch (error) {
        console.error('Driver signup error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data',
                errors: error.errors
            });
        }
        return res.status(500).json({
            status: 'error',
            message: 'Registration failed. Please try again.'
        });
    }
}));
router.post('/verify-otp', rateLimiterMiddleware_1.default, otp_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        const tempDriver = yield getTempDriver(phone);
        if (!tempDriver) {
            return res.status(400).json({
                message: 'Registration session expired. Please start over.'
            });
        }
        // Hash the password
        const salt = yield bcrypt_1.default.genSalt(10);
        const hashedPassword = yield bcrypt_1.default.hash(tempDriver.password, salt);
        // Handle optional fields with proper default values
        const address = tempDriver.address || '';
        const profile_picture = tempDriver.profile_picture || null;
        // Insert driver
        yield (0, util_1.query)(`INSERT INTO drivers (
                username, password, email, phone, address, profile_picture,
                vehicle_type, vehicle_number, license_number,
                service_area, max_delivery_distance, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [
            tempDriver.username,
            hashedPassword,
            tempDriver.email,
            tempDriver.phone,
            address,
            profile_picture,
            tempDriver.vehicle_type,
            tempDriver.vehicle_number,
            tempDriver.license_number,
            tempDriver.service_area,
            tempDriver.max_delivery_distance
        ]);
        // Clean up
        yield deleteTempDriver(phone);
        yield redisClient_1.default.del(`otp:${phone}`);
        return res.status(201).json({
            message: 'Registration successful. You can now sign in.'
        });
    }
    catch (error) {
        console.error('Driver verification error:', error);
        return res.status(500).json({
            message: error instanceof Error ? error.message : 'Verification failed'
        });
    }
}));
// Updated signin route in driver auth routes
router.post('/signin', rateLimiterMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        // Check if driver exists
        const driver = yield checkDriver(username, password);
        if (!driver) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }
        // Generate JWT token - only include id (no role) to distinguish from user tokens
        const token = jsonwebtoken_1.default.sign({ id: driver.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Set cookie and return token for local storage
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: token,
            driver: {
                id: driver.id,
                username: driver.username,
                email: driver.email,
                phone: driver.phone,
                address: driver.address,
                profile_picture: driver.profile_picture,
                vehicle_type: driver.vehicle_type,
                vehicle_number: driver.vehicle_number,
                license_number: driver.license_number,
                availability_status: driver.availability_status,
                service_area: driver.service_area,
                max_delivery_distance: driver.max_delivery_distance,
                rating: driver.rating,
                total_deliveries: driver.total_deliveries
            }
        });
    }
    catch (error) {
        console.error('Driver login error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Login failed. Please try again.'
        });
    }
}));
router.post('/resend-otp', rateLimiterMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number is required'
            });
        }
        const tempDriver = yield getTempDriver(phone);
        if (!tempDriver) {
            return res.status(400).json({
                status: 'error',
                message: 'Registration session expired. Please start over.'
            });
        }
        // Generate and send a new OTP
        const otp = optService_1.default.generateOtp();
        yield optService_1.default.sendOtp(phone, otp);
        return res.status(200).json({
            status: 'success',
            message: 'OTP resent successfully',
            data: {
                phone,
                expiresIn: '5 minutes'
            }
        });
    }
    catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to resend OTP. Please try again.'
        });
    }
}));
router.get('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check for token in the Authorization header
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else {
            // Fallback to cookie if no Authorization header
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(200).json({
                status: 'error',
                authenticated: false,
                message: 'No token found'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(200).json({
                status: 'error',
                authenticated: false,
                message: 'Invalid token'
            });
        }
        // Get driver details
        const driverResult = yield (0, util_1.query)('SELECT * FROM drivers WHERE id = $1', [decoded.id]);
        if (driverResult.rows.length === 0) {
            return res.status(200).json({
                status: 'error',
                authenticated: false,
                message: 'Driver not found'
            });
        }
        const driver = driverResult.rows[0];
        return res.status(200).json({
            status: 'success',
            authenticated: true,
            driver: {
                id: driver.id,
                username: driver.username,
                email: driver.email,
                phone: driver.phone,
                address: driver.address,
                profile_picture: driver.profile_picture,
                vehicle_type: driver.vehicle_type,
                vehicle_number: driver.vehicle_number,
                license_number: driver.license_number,
                availability_status: driver.availability_status,
                service_area: driver.service_area,
                max_delivery_distance: driver.max_delivery_distance,
                rating: driver.rating,
                total_deliveries: driver.total_deliveries
            }
        });
    }
    catch (error) {
        console.error('Driver verification error:', error);
        return res.status(200).json({
            status: 'error',
            authenticated: false,
            message: 'Token verification failed'
        });
    }
}));
// Logout endpoint
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Clear the cookie
        res.clearCookie('token');
        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to logout'
        });
    }
}));
// Import driver profile routes
const driver_profile_1 = __importDefault(require("./driver-profile"));
router.use('/', driver_profile_1.default);
exports.default = router;
