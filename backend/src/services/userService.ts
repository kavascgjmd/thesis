import { query } from '../db/util';
import bcrypt from 'bcrypt';
import redisClient from '../redisClient';

interface UserDetails {
    username: string;
    password: string;
    email: string;
    role: string;
    phone?: string;
    address?: string;
}

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    phone?: string;
    address?: string;
    created_at: Date;
    updated_at: Date;
}

class UserService {
    private readonly TEMP_USER_EXPIRY = 600; // 10 minutes
    private readonly SALT_ROUNDS = 10;

    async saveTempUser(userDetails: UserDetails, phone: string): Promise<void> {
        try {
            await redisClient.set(
                `tempUser:${phone}`, 
                JSON.stringify(userDetails), 
                { EX: this.TEMP_USER_EXPIRY }
            );
        } catch (error) {
            console.error('Failed to save temp user:', error);
            throw new Error('Failed to initiate registration');
        }
    }

    async getTempUser(phone: string): Promise<UserDetails | null> {
        try {
            const data = await redisClient.get(`tempUser:${phone}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to get temp user:', error);
            throw new Error('Failed to retrieve registration data');
        }
    }

    async deleteTempUser(phone: string): Promise<void> {
        try {
            await redisClient.del(`tempUser:${phone}`);
        } catch (error) {
            console.error('Failed to delete temp user:', error);
        }
    }

    async insertUser(userDetails: UserDetails): Promise<void> {
        const { username, password, email, phone, role, address } = userDetails;
        const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

        const text = `
        INSERT INTO users (
            username, 
            password, 
            email, 
            phone, 
            role, 
            address, 
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `;
        
        try {
            await query(text, [username, hashedPassword, email, phone, role, address]);
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                if (error.constraint.includes('username')) {
                    throw new Error('Username already taken');
                } else if (error.constraint.includes('email')) {
                    throw new Error('Email already registered');
                } else if (error.constraint.includes('phone')) {
                    throw new Error('Phone number already registered');
                }
            }
            throw new Error('Failed to create user account');
        }
    }

    async checkUser(username: string, password: string): Promise<any> {
        const text = `
            SELECT id, username, password, role, email, phone 
            FROM users 
            WHERE username = $1
        `;
        
        try {
            const result = await query(text, [username]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return null;
            }

            // Remove password from returned data
            delete user.password;
            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw new Error('Authentication failed');
        }
    }

    async getUserById(userId: string): Promise<User | null> {
        const text = `
        SELECT 
            id,
            username,
            email,
            role,
            phone,
            address,
            created_at,
            updated_at
        FROM users 
        WHERE id = $1
    `;
        
        try {
            const result = await query(text, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0] as User;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw new Error('Failed to fetch user details');
        }
    }
}

export default new UserService();