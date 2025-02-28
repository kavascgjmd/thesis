import { query } from '../util';

export async function createDriversTable() {
    const createDriversTableQuery = `
        CREATE TABLE IF NOT EXISTS drivers (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(15) NOT NULL UNIQUE,
            address VARCHAR(255),
            profile_picture VARCHAR(255),
            vehicle_type VARCHAR(50) NOT NULL,
            vehicle_number VARCHAR(50) NOT NULL,
            license_number VARCHAR(50) NOT NULL,
            availability_status VARCHAR(20) DEFAULT 'OFFLINE',
            current_location POINT,
            service_area VARCHAR(255),
            max_delivery_distance INTEGER,
            rating DECIMAL(3,2) DEFAULT 0.00,
            total_deliveries INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await query(createDriversTableQuery);
}