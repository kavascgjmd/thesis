import { Twilio } from 'twilio';
import redisClient from '../redisClient';

class OtpService {
    private twilioClient: Twilio;
    private readonly OTP_EXPIRY = 300; // 5 minutes

    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        console.log(accountSid);
        console.log(authToken);
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured');
        }
        
        this.twilioClient = new Twilio(accountSid, authToken);
    }

    generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOtp(phone: string, otp: string): Promise<void> {
        try {
            // Store OTP in Redis
            await redisClient.set(`otp:${phone}`, otp, { EX: this.OTP_EXPIRY });
            
            // Send via Twilio
            await this.twilioClient.messages.create({
                body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
        } catch (error) {
            console.error('Failed to send OTP:', error);
            throw new Error('Failed to send OTP. Please try again.');
        }
    }

    async verifyOtp(phone: string, otp: string): Promise<boolean> {
        try {
            const storedOtp = await redisClient.get(`otp:${phone}`);
            return storedOtp === otp;
        } catch (error) {
            console.error('OTP verification error:', error);
            throw new Error('Failed to verify OTP');
        }
    }
}

export default new OtpService();