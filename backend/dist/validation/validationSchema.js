"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = void 0;
const zod_1 = require("zod");
exports.userSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one digit')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    email: zod_1.z.string().email('Invalid email address'),
    phone: zod_1.z.string().min(10, 'Phone number must be at least 10 digits'),
    role: zod_1.z.enum(['Admin', 'Donor', 'NGO', 'Recipient']),
    // Add these missing fields
    address: zod_1.z.string().optional(),
    profile_picture: zod_1.z.string().optional() // For base64 encoded image
});
