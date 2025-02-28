import { query } from '../util';

export async function createFoodRequestTable() {
    const createFoodRequestTableQuery = `
        CREATE TABLE IF NOT EXISTS food_requests (
            id SERIAL PRIMARY KEY,
            ngo_id INTEGER REFERENCES ngos(id),
            donation_id INTEGER REFERENCES food_donations(id),
            request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            request_status VARCHAR(50)
        );
    `;
    await query(createFoodRequestTableQuery);
}
