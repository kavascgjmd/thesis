import { query } from '../util';

export async function createDriverLocationsTable() {
    const createDriverLocationsTableQuery = `
        CREATE TABLE IF NOT EXISTS driver_locations (
            id SERIAL PRIMARY KEY,
            driver_id INTEGER REFERENCES users(id),
            latitude DECIMAL(10, 6) NOT NULL,
            longitude DECIMAL(10, 6) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await query(createDriverLocationsTableQuery);
}
