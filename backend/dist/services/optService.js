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
const twilio_1 = require("twilio");
const redisClient_1 = __importDefault(require("../redisClient"));
class OtpService {
    constructor() {
        this.OTP_EXPIRY = 300; // 5 minutes
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        console.log(accountSid);
        console.log(authToken);
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured');
        }
        this.twilioClient = new twilio_1.Twilio(accountSid, authToken);
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    sendOtp(phone, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Store OTP in Redis
                yield redisClient_1.default.set(`otp:${phone}`, otp, { EX: this.OTP_EXPIRY });
                // Send via Twilio
                yield this.twilioClient.messages.create({
                    body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phone
                });
            }
            catch (error) {
                console.error('Failed to send OTP:', error);
                throw new Error('Failed to send OTP. Please try again.');
            }
        });
    }
    verifyOtp(phone, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const storedOtp = yield redisClient_1.default.get(`otp:${phone}`);
                return storedOtp === otp;
            }
            catch (error) {
                console.error('OTP verification error:', error);
                throw new Error('Failed to verify OTP');
            }
        });
    }
}
exports.default = new OtpService();
