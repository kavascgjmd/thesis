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
const validationSchema_1 = require("../validation/validationSchema");
const optService_1 = __importDefault(require("../services/optService"));
const userService_1 = __importDefault(require("../services/userService"));
const otp_1 = __importDefault(require("../middlewares/otp"));
const rateLimiterMiddleware_1 = __importDefault(require("../middlewares/rateLimiterMiddleware"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const redisClient_1 = __importDefault(require("../redisClient"));
const router = (0, express_1.Router)();
router.post('/signup', rateLimiterMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validationResult = validationSchema_1.userSchema.safeParse(req.body);
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
        const userData = validationResult.data;
        // Check for existing user
        const existingUser = yield userService_1.default.checkUser(userData.username, '');
        if (existingUser) {
            return res.status(409).json({
                status: 'error',
                message: 'Username already exists'
            });
        }
        // Save temp user and send OTP
        yield userService_1.default.saveTempUser(userData, userData.phone);
        const otp = optService_1.default.generateOtp();
        yield optService_1.default.sendOtp(userData.phone, otp);
        return res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully. Please verify to complete signup.',
            data: {
                phone: userData.phone,
                expiresIn: '5 minutes'
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
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
        const tempUser = yield userService_1.default.getTempUser(phone);
        if (!tempUser) {
            return res.status(400).json({
                message: 'Registration session expired. Please start over.'
            });
        }
        const userId = yield userService_1.default.insertUser(tempUser);
        yield userService_1.default.deleteTempUser(phone);
        yield redisClient_1.default.del(`otp:${phone}`);
        // Generate token now that user is created
        const token = jsonwebtoken_1.default.sign({ id: userId, role: tempUser.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Set the token in a cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        return res.status(201).json({
            message: 'Registration successful. You are now signed in.',
            user: {
                username: tempUser.username,
                email: tempUser.email,
                role: tempUser.role
            }
        });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            message: error instanceof Error ? error.message : 'Verification failed'
        });
    }
}));
router.post('/signin', rateLimiterMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield userService_1.default.checkUser(username, password);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        return res.status(200).json({
            message: 'Login successful',
            user: {
                username: user.username,
                email: user.email,
                role: user.role,
                profile_picture_url: user.profile_picture_url
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Login failed. Please try again.' });
    }
}));
router.get('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(200).json({
                authenticated: false,
                message: 'No token found'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(200).json({
                authenticated: false,
                message: 'Invalid token'
            });
        }
        // Optionally fetch user data if needed
        const user = yield userService_1.default.getUserById(decoded.id);
        if (!user) {
            return res.status(200).json({
                authenticated: false,
                message: 'User not found'
            });
        }
        return res.status(200).json({
            authenticated: true,
            user: {
                username: user.username,
                email: user.email,
                role: user.role,
                profile_picture_url: user.profile_picture_url
            }
        });
    }
    catch (error) {
        console.error('Verification error:', error);
        return res.status(200).json({
            authenticated: false,
            message: 'Token verification failed'
        });
    }
}));
exports.default = router;
