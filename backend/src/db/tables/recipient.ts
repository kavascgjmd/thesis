import { query } from '../util';

export async function createRecipientTable() {
    const createRecipientTableQuery = `
   CREATE TABLE IF NOT EXISTS recipients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    recipient_name VARCHAR(255),
    recipient_details TEXT,
    contact_person VARCHAR(255),
    contact_number VARCHAR(50),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_image VARCHAR(255),
    address TEXT,
    proof_of_need TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `;
    try {
        await query(createRecipientTableQuery);
        console.log('Recipient table created successfully');
    } catch (error) {
        console.error('Error creating recipient table:', error);
        throw error;
    }
}