import { query } from '../util';

export async function createDriverLocationHistoryTable() {
    const createDriverLocationHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS driver_location_history (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES drivers(id),
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        accuracy DECIMAL(10, 2),
        heading INTEGER,
        speed DECIMAL(6, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
    try {
        await query(createDriverLocationHistoryTableQuery);
        console.log('Driver location history table created successfully');
    } catch (error) {
        console.error('Error creating driver location history table:', error);
        throw error;
    }
}