import { query } from '../util';

export async function createFoodDonationTable() {
  const createFoodDonationTableQuery = `
CREATE TABLE IF NOT EXISTS food_donations (
    id SERIAL PRIMARY KEY,
    donor_id INTEGER REFERENCES donors(id),
    food_type VARCHAR(50),
    food_category VARCHAR(50),
    quantity INTEGER,
    servings INTEGER,
    weight_kg DECIMAL(10,2),
    package_size VARCHAR(50),
    expiration_time TIMESTAMP WITH TIME ZONE,
    pickup_location VARCHAR(255),
    image VARCHAR(255),
    image_url VARCHAR(255),
    image_storage VARCHAR(50),
    availability_schedule VARCHAR(255),
    status VARCHAR(50)
);
  `;
  
  await query(createFoodDonationTableQuery);
}