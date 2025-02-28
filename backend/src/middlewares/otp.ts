import { Response, NextFunction } from 'express';
import { OtpVerifyRequest } from '../types/custom'; // Import your custom request type
import otpService from '../services/optService';

const verifyOtpMiddleware = async (req: OtpVerifyRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, otp } = req.body;

    // Verify OTP
    const isValidOtp = await otpService.verifyOtp(phone, otp);
    if (!isValidOtp) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid OTP. Please try again.',
      });
      return;
    }

    // If OTP is valid, proceed to the next middleware
    next();
  } catch (error) {
    console.error('OTP verification error:', error);

    res.status(500).json({
      status: 'error',
      message: 'OTP verification failed. Please try again later.',
    });
  }
};

export default verifyOtpMiddleware;
