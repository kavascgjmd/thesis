"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rateLimiterMiddleware = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 'error',
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
});
exports.default = rateLimiterMiddleware;
