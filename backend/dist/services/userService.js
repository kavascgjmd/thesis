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
            const { username, password, email, phone, role, address } = userDetails;
            const hashedPassword = yield bcrypt_1.default.hash(password, this.SALT_ROUNDS);
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
                yield (0, util_1.query)(text, [username, hashedPassword, email, phone, role, address]);
            }
            catch (error) {
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
    checkUser(username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = `
            SELECT id, username, password, role, email, phone 
            FROM users 
            WHERE username = $1
        `;
            try {
                const result = yield (0, util_1.query)(text, [username]);
                if (result.rows.length === 0) {
                    return null;
                }
                const user = result.rows[0];
                const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
                if (!isPasswordValid) {
                    return null;
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
}
exports.default = new UserService();
