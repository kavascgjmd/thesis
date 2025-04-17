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
    id_type TEXT,
    id_number TEXT,
    id_image TEXT,
    id_image_url VARCHAR(255),
    id_image_storage VARCHAR(50),
    address TEXT,
    proof_of_need TEXT,
    proof_of_need_url VARCHAR(255),
    proof_of_need_storage VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    can_place_orders BOOLEAN DEFAULT FALSE,
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