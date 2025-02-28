import { query } from '../util';

export async function createUserTable() {
    const createUserTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50),
            profile_picture VARCHAR(255),
            address TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await query(createUserTableQuery);
        console.log('User table created successfully');
    } catch (error) {
        console.error('Error creating user table:', error);
        throw error;
    }
}