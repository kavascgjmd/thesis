
import { z } from 'zod';

export const userSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one digit')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    role: z.enum(['Admin', 'Donor', 'NGO', 'Recipient'])
});
