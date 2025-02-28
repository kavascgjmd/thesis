import { Router, Request, Response } from 'express';
import { z } from 'zod';
import otpService from '../services/optService';
import rateLimiterMiddleware from '../middlewares/rateLimiterMiddleware';
import verifyOtpMiddleware from '../middlewares/otp';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import redisClient from '../redisClient';
import { query } from '../db/util';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

interface JwtPayload {
    id: string;
}

// Driver validation schema
const driverSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15),
    address: z.string().optional(),
    profile_picture: z.string().optional().nullable(),
    vehicle_type: z.string().min(2).max(50),
    vehicle_number: z.string().min(3).max(50),
    license_number: z.string().min(3).max(50),
    service_area: z.string().max(255),
    max_delivery_distance: z.number().int().positive(),
});

// Create a function to save temporary driver data
const saveTempDriver = async (driverData: any, phone: string) => {
    const data = JSON.stringify(driverData);
    await redisClient.set(`temp_driver:${phone}`, data, { EX: 300 }); // 5 minutes
};

// Get temporary driver data
const getTempDriver = async (phone: string) => {
    const data = await redisClient.get(`temp_driver:${phone}`);
    if (!data) return null;
    return JSON.parse(data);
};

// Delete temporary driver data
const deleteTempDriver = async (phone: string) => {
    await redisClient.del(`temp_driver:${phone}`);
};

// Check if driver exists
const checkDriver = async (identifier: string, password: string = '') => {
    // Check if the identifier is an email or username
    const isEmail = identifier.includes('@');
    
    const sql = isEmail
        ? 'SELECT * FROM drivers WHERE email = $1'
        : 'SELECT * FROM drivers WHERE username = $1';
    
    const result = await query(sql, [identifier]);
    
    if (result.rows.length === 0) return null;
    
    const driver = result.rows[0];
    
    // If password is provided, validate it
    if (password && !await bcrypt.compare(password, driver.password)) {
        return null;
    }
    
    return driver;
};

router.post('/signup', rateLimiterMiddleware, async (req: Request, res: Response): Promise<any> => {
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
        const existingDriver = await query(
            'SELECT * FROM drivers WHERE username = $1 OR email = $2',
            [driverData.username, driverData.email]
        );

        if (existingDriver.rows.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Username or email already exists'
            });
        }

        // Save temp driver and send OTP
        await saveTempDriver(driverData, driverData.phone);
        const otp = otpService.generateOtp();
        await otpService.sendOtp(driverData.phone, otp);

        return res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully. Please verify to complete signup.',
            data: {
                phone: driverData.phone,
                expiresIn: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Driver signup error:', error);

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
});

router.post('/verify-otp', rateLimiterMiddleware, verifyOtpMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { phone } = req.body;
        const tempDriver = await getTempDriver(phone);

        if (!tempDriver) {
            return res.status(400).json({ 
                message: 'Registration session expired. Please start over.' 
            });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempDriver.password, salt);
        
        // Handle optional fields with proper default values
        const address = tempDriver.address || '';
        const profile_picture = tempDriver.profile_picture || null;
        
        // Insert driver
        await query(
            `INSERT INTO drivers (
                username, password, email, phone, address, profile_picture,
                vehicle_type, vehicle_number, license_number,
                service_area, max_delivery_distance, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
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
            ]
        );
            
        // Clean up
        await deleteTempDriver(phone);
        await redisClient.del(`otp:${phone}`);
            
        return res.status(201).json({ 
            message: 'Registration successful. You can now sign in.' 
        });
    } catch (error) {
        console.error('Driver verification error:', error);
        return res.status(500).json({ 
            message: error instanceof Error ? error.message : 'Verification failed' 
        });
    }
});

// Updated signin route in driver auth routes
router.post('/signin', rateLimiterMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { username, password } = req.body;
        
        // Check if driver exists
        const driver = await checkDriver(username, password);
        
        if (!driver) {
            return res.status(401).json({ 
                status: 'error',
                message: 'Invalid credentials' 
            });
        }
        
        // Generate JWT token - only include id (no role) to distinguish from user tokens
        const token = jwt.sign(
            { id: driver.id },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

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
    } catch (error) {
        console.error('Driver login error:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Login failed. Please try again.' 
        });
    }
});
router.post('/resend-otp', rateLimiterMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number is required'
            });
        }

        const tempDriver = await getTempDriver(phone);
        if (!tempDriver) {
            return res.status(400).json({
                status: 'error',
                message: 'Registration session expired. Please start over.'
            });
        }

        // Generate and send a new OTP
        const otp = otpService.generateOtp();
        await otpService.sendOtp(phone, otp);

        return res.status(200).json({
            status: 'success',
            message: 'OTP resent successfully',
            data: {
                phone,
                expiresIn: '5 minutes'
            }
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to resend OTP. Please try again.'
        });
    }
});

router.get('/verify', async (req: Request, res: Response): Promise<any> => {
    try {
        // Check for token in the Authorization header
        const authHeader = req.headers.authorization;
        let token = '';
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        
        if (!decoded) {
            return res.status(200).json({
                status: 'error',
                authenticated: false,
                message: 'Invalid token'
            });
        }

        // Get driver details
        const driverResult = await query(
            'SELECT * FROM drivers WHERE id = $1',
            [decoded.id]
        );
        
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

    } catch (error) {
        console.error('Driver verification error:', error);
        return res.status(200).json({
            status: 'error',
            authenticated: false,
            message: 'Token verification failed'
        });
    }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response): Promise<any> => {
    try {
        // Clear the cookie
        res.clearCookie('token');
        
        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to logout'
        });
    }
});

// Import driver profile routes
import driverProfileRouter from './driver-profile';
router.use('/', driverProfileRouter);

export default router;