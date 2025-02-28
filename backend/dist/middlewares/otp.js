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
const optService_1 = __importDefault(require("../services/optService"));
const verifyOtpMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, otp } = req.body;
        // Verify OTP
        const isValidOtp = yield optService_1.default.verifyOtp(phone, otp);
        if (!isValidOtp) {
            res.status(400).json({
                status: 'error',
                message: 'Invalid OTP. Please try again.',
            });
            return;
        }
        // If OTP is valid, proceed to the next middleware
        next();
    }
    catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'OTP verification failed. Please try again later.',
        });
    }
});
exports.default = verifyOtpMiddleware;
