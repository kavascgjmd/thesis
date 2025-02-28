import { query } from '../util';
export async function createNGOTable() {
    const createNGOTableQuery = `
        CREATE TABLE IF NOT EXISTS ngos (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            ngo_name VARCHAR(255),
            mission_statement TEXT,
            contact_person VARCHAR(255),
            contact_number VARCHAR(50),
            operating_hours VARCHAR(255),
            target_demographics TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await query(createNGOTableQuery);
        console.log('NGO table created successfully');
    } catch (error) {
        console.error('Error creating NGO table:', error);
        throw error;
    }
}