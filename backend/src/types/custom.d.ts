import { Request } from 'express';

export interface SignupRequest extends Request {
    body: {
        username: string;
        password: string;
        email: string;
        phone: string;
        role: 'Admin' | 'Donor' | 'NGO' | 'Recipient';
    }
}

export interface OtpVerifyRequest extends Request {
    body: {
        phone: string;
        otp: string;
    }
}

export interface UserPayload {
  id: number;
  role: string;
  // any other user properties you have
}

export interface DriverPayload {
  id: number;
  role: 'driver';
}

// Extend Express Request type to include driver
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      driver?: DriverPayload;
    }
  }
}
  
  