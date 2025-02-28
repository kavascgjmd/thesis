import { query } from '../util';

export async function createDonorTable() {
    const createDonorTableQuery = `
        CREATE TABLE IF NOT EXISTS donors (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            donor_type VARCHAR(50),
            organization_name VARCHAR(255),
            organization_details TEXT,
            contact_person VARCHAR(255),
            contact_number VARCHAR(50),
            operating_hours VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await query(createDonorTableQuery);
        console.log('Donor table created successfully');
    } catch (error) {
        console.error('Error creating donor table:', error);
        throw error;
    }
}