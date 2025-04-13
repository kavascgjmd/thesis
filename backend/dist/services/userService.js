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
const util_1 = require("../db/util");
const bcrypt_1 = __importDefault(require("bcrypt"));
const redisClient_1 = __importDefault(require("../redisClient"));
const s3Service_1 = __importDefault(require("./s3Service"));
class UserService {
    constructor() {
        this.TEMP_USER_EXPIRY = 600; // 10 minutes
        this.SALT_ROUNDS = 10;
    }
    saveTempUser(userDetails, phone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield redisClient_1.default.set(`tempUser:${phone}`, JSON.stringify(userDetails), { EX: this.TEMP_USER_EXPIRY });
            }
            catch (error) {
                console.error('Failed to save temp user:', error);
                throw new Error('Failed to initiate registration');
            }
        });
    }
    getTempUser(phone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield redisClient_1.default.get(`tempUser:${phone}`);
                return data ? JSON.parse(data) : null;
            }
            catch (error) {
                console.error('Failed to get temp user:', error);
                throw new Error('Failed to retrieve registration data');
            }
        });
    }
    deleteTempUser(phone) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield redisClient_1.default.del(`tempUser:${phone}`);
            }
            catch (error) {
                console.error('Failed to delete temp user:', error);
            }
        });
    }
    insertUser(userDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const { username, password, email, phone, role, address, profile_picture } = userDetails;
            const hashedPassword = yield bcrypt_1.default.hash(password, this.SALT_ROUNDS);
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
                const result = yield (0, util_1.query)(insertUserText, [username, hashedPassword, email, phone, role, address]);
                const userId = result.rows[0].id;
                // If there's a profile picture, upload it
                if (profile_picture && profile_picture.length > 0) {
                    // Detect the file type from the base64 string
                    const fileType = this.getFileTypeFromBase64(profile_picture);
                    // Upload to S3 or local storage depending on size
                    const { url, storageType } = yield s3Service_1.default.uploadProfilePicture(userId, profile_picture, fileType);
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
                    yield (0, util_1.query)(updateUserText, [truncatedBase64, url, storageType, userId]);
                }
                return userId;
            }
            catch (error) {
                console.error('Error creating user:', error);
                if (error.code === '23505') { // Unique violation
                    if (error.constraint.includes('username')) {
                        throw new Error('Username already taken');
                    }
                    else if (error.constraint.includes('email')) {
                        throw new Error('Email already registered');
                    }
                    else if (error.constraint.includes('phone')) {
                        throw new Error('Phone number already registered');
                    }
                }
                throw new Error('Failed to create user account');
            }
        });
    }
    getFileTypeFromBase64(base64String) {
        const match = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        return match ? match[1] : 'image/jpeg';
    }
    checkUser(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = `
            SELECT id, username, password, role, email, phone, profile_picture_url 
            FROM users 
            WHERE username = $1
        `;
            try {
                const result = yield (0, util_1.query)(text, [username]);
                if (result.rows.length === 0) {
                    return null;
                }
                const user = result.rows[0];
                // Skip password check if it's empty (for testing or if we're just checking existence)
                if (password) {
                    const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
                    if (!isPasswordValid) {
                        return null;
                    }
                }
                // Remove password from returned data
                delete user.password;
                return user;
            }
            catch (error) {
                console.error('Login error:', error);
                throw new Error('Authentication failed');
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield (0, util_1.query)(text, [userId]);
                if (result.rows.length === 0) {
                    return null;
                }
                return result.rows[0];
            }
            catch (error) {
                console.error('Error fetching user by ID:', error);
                throw new Error('Failed to fetch user details');
            }
        });
    }
    updateProfilePicture(userId, base64Image) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get current profile picture URL if it exists
                const user = yield this.getUserById(userId);
                if (user === null || user === void 0 ? void 0 : user.profile_picture_url) {
                    // Delete the old image
                    yield s3Service_1.default.deleteImage(user.profile_picture_url);
                }
                // Detect the file type from the base64 string
                const fileType = this.getFileTypeFromBase64(base64Image);
                // Upload to S3 or local storage depending on size
                const { url, storageType } = yield s3Service_1.default.uploadProfilePicture(userId, base64Image, fileType);
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
                yield (0, util_1.query)(updateUserText, [truncatedBase64, url, storageType, userId]);
                return url;
            }
            catch (error) {
                console.error('Error updating profile picture:', error);
                throw new Error('Failed to update profile picture');
            }
        });
    }
}
exports.default = new UserService();
