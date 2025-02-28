import { Router, Request, Response } from 'express';
import { userSchema } from '../validation/validationSchema';
import otpService from '../services/optService';
import userService from '../services/userService';
import verifyOtpMiddleware  from '../middlewares/otp';
import rateLimiterMiddleware from '../middlewares/rateLimiterMiddleware';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import redisClient from '../redisClient';
import { SignupRequest } from '../types/custom';

const router = Router();
interface JwtPayload {
    id: string;
    role: string;
}

router.post('/signup', rateLimiterMiddleware, async (req: SignupRequest, res: Response): Promise<any> => {
    try {
        const validationResult = userSchema.safeParse(req.body);

        if (!validationResult.success) {
            console.log(req.body);
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
        const existingUser = await userService.checkUser(userData.username, '');
        if (existingUser) {
            return res.status(409).json({
                status: 'error',
                message: 'Username already exists'
            });
        }

        // Save temp user and send OTP
        await userService.saveTempUser(userData, userData.phone);
        const otp = otpService.generateOtp();
        await otpService.sendOtp(userData.phone, otp);

        return res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully. Please verify to complete signup.',
            data: {
                phone: userData.phone,
                expiresIn: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Signup error:', error);

        if (error instanceof z.ZodError) {
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
}) ;

router.post('/verify-otp', rateLimiterMiddleware, verifyOtpMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { phone } = req.body;
        const tempUser = await userService.getTempUser(phone);

        if (!tempUser) {
            return res.status(400).json({ 
                message: 'Registration session expired. Please start over.' 
            });
        }

        await userService.insertUser(tempUser);
        await userService.deleteTempUser(phone);
        await redisClient.del(`otp:${phone}`);

        return res.status(201).json({ 
            message: 'Registration successful. You can now sign in.' 
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ 
            message: error instanceof Error ? error.message : 'Verification failed' 
        });
    }
});

router.post('/signin', rateLimiterMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { username, password } = req.body;
        const user = await userService.checkUser(username, password);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

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
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

router.get('/verify', async (req: Request, res: Response): Promise<any> => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(200).json({ 
                authenticated: false,
                message: 'No token found'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        
        if (!decoded) {
            return res.status(200).json({ 
                authenticated: false,
                message: 'Invalid token'
            });
        }

        // Optionally fetch user data if needed
        const user = await userService.getUserById(decoded.id);
        
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
                role: user.role
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(200).json({ 
            authenticated: false,
            message: 'Token verification failed'
        });
    }
});

export default router;
