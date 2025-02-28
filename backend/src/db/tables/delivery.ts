import { query } from '../util';
export async function createDeliveryTable() { 
    const createDeliveryTableQuery = `
          CREATE TABLE IF NOT EXISTS deliveries (
            id SERIAL PRIMARY KEY,
            request_id INTEGER REFERENCES orders(id),
            driver_id INTEGER REFERENCES drivers(id),
            delivery_status VARCHAR(50),
            pickup_time TIMESTAMP WITH TIME ZONE,
            estimated_delivery_time TIMESTAMP WITH TIME ZONE,
            actual_delivery_time TIMESTAMP WITH TIME ZONE,
            delivery_time TIMESTAMP WITH TIME ZONE,
            gps_location VARCHAR(255),
            delivery_confirmation VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await query(createDeliveryTableQuery);
}