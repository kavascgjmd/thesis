import { query } from '../util';

export async function createDeliveryRoutesTable() {
    const createDeliveryRoutesTableQuery = `
        CREATE TABLE IF NOT EXISTS delivery_routes (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id),
            total_distance DECIMAL(10, 2),
            estimated_duration INTEGER, -- in minutes
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await query(createDeliveryRoutesTableQuery);
}
