import { query } from '../util';
export async function createCartTable() {
    const createCartTableQuery = `
  CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    delivery_fee NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `;
    try {
        await query(createCartTableQuery);
        console.log('Cart table created successfully');
    } catch (error) {
        console.error('Error creating cart table:', error);
        throw error;
    }
}