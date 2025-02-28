import { query } from '../util';

export async function createFoodDonationTable() {
    const createFoodDonationTableQuery = `
        CREATE TABLE IF NOT EXISTS food_donations (
            id SERIAL PRIMARY KEY,
            donor_id INTEGER REFERENCES donors(id),
            food_type VARCHAR(50),
            quantity INTEGER,
            expiration_time TIMESTAMP WITH TIME ZONE,
            pickup_location VARCHAR(255),
            image VARCHAR(255),
            availability_schedule VARCHAR(255),
            status VARCHAR(50)
        );
    `;
    await query(createFoodDonationTableQuery);
}
