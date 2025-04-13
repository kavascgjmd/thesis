import { query } from '../db/util';
import bcrypt from 'bcrypt';
import redisClient from '../redisClient';
import s3Service from './s3Service';

interface UserDetails {
    username: string;
    password: string;
    email: string;
    role: string;
    phone?: string;
    address?: string;
    profile_picture?: string | null;
}

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    phone?: string;
    address?: string;
    profile_picture_url?: string;
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

    async insertUser(userDetails: UserDetails): Promise<string> {
        const { username, password, email, phone, role, address, profile_picture } = userDetails;
        const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
        // First create the user to get the ID
        const insertUserText = `
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
            RETURNING id
        `;
        
        try {
            // Insert the user first to get the ID
            const result = await query(insertUserText, [username, hashedPassword, email, phone, role, address]);
            const userId = result.rows[0].id;
            // If there's a profile picture, upload it
            if (profile_picture && profile_picture.length > 0) {
                // Detect the file type from the base64 string
                const fileType = this.getFileTypeFromBase64(profile_picture);
                // Upload to S3 or local storage depending on size
                const { url, storageType } = await s3Service.uploadProfilePicture(
                    userId, 
                    profile_picture, 
                    fileType
                );
                // Update the user with the profile picture URL and storage type
                const updateUserText = `
                    UPDATE users 
                    SET profile_picture = $1,
                        profile_picture_url = $2, 
                        profile_picture_storage = $3,
                        updated_at = NOW()
                    WHERE id = $4
                `;
                
                // Store truncated base64 string to avoid DB size issues
                const truncatedBase64 = profile_picture.substring(0, 255);
                
                await query(updateUserText, [truncatedBase64, url, storageType, userId]);
            }
            
            return userId;
        } catch (error: any) {
            console.error('Error creating user:', error);
            
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
    
    private getFileTypeFromBase64(base64String: string): string {
        const match = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        return match ? match[1] : 'image/jpeg';
    }

    async checkUser(username: string, password: string): Promise<any> {
        const text = `
            SELECT id, username, password, role, email, phone, profile_picture_url 
            FROM users 
            WHERE username = $1
        `;
        
        try {
            const result = await query(text, [username]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            
            // Skip password check if it's empty (for testing or if we're just checking existence)
            if (password) {
                const isPasswordValid = await bcrypt.compare(password, user.password);
                
                if (!isPasswordValid) {
                    return null;
                }
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
            profile_picture_url,
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

    async updateProfilePicture(userId: string, base64Image: string): Promise<string> {
        try {
            // Get current profile picture URL if it exists
            const user = await this.getUserById(userId);
            if (user?.profile_picture_url) {
                // Delete the old image
                await s3Service.deleteImage(user.profile_picture_url);
            }
            
            // Detect the file type from the base64 string
            const fileType = this.getFileTypeFromBase64(base64Image);
            
            // Upload to S3 or local storage depending on size
            const { url, storageType } = await s3Service.uploadProfilePicture(
                userId, 
                base64Image, 
                fileType
            );
            
            // Store truncated base64 string to avoid DB size issues
            const truncatedBase64 = base64Image.substring(0, 255);
            
            // Update the user with the new profile picture URL
            const updateUserText = `
                UPDATE users 
                SET profile_picture = $1,
                    profile_picture_url = $2, 
                    profile_picture_storage = $3,
                    updated_at = NOW()
                WHERE id = $4
            `;
            
            await query(updateUserText, [truncatedBase64, url, storageType, userId]);
            
            return url;
        } catch (error) {
            console.error('Error updating profile picture:', error);
            throw new Error('Failed to update profile picture');
        }
    }
}

export default new UserService();