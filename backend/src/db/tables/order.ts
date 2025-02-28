import { query } from '../util';
export async function createOrdersTable() {
    const createOrdersTableQuery = `
        CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id),
    user_id INTEGER REFERENCES users(id),
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    delivery_fee NUMERIC(10,2) DEFAULT 0.00,  -- Changed to NUMERIC
    total_amount NUMERIC(10,2) DEFAULT 0.00,   -- Changed to NUMERIC
    delivery_address TEXT,
    order_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await query(createOrdersTableQuery);
        console.log('Orders table created successfully');
    } catch (error) {
        console.error('Error creating orders table:', error);
        throw error;
    }
}