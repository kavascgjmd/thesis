import { query } from '../util';
export async function createCartItemsTable() {
    const createCartItemsTableQuery = `
        CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
            food_donation_id INTEGER REFERENCES food_donations(id),
            donor_id INTEGER REFERENCES donors(id),
            quantity INTEGER DEFAULT 1,
            item_total DECIMAL(10,2) DEFAULT 0.00,
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cart_id, food_donation_id)
        );
    `;
    try {
        await query(createCartItemsTableQuery);
        console.log('Cart items table created successfully');
    } catch (error) {
        console.error('Error creating cart items table:', error);
        throw error;
    }
}