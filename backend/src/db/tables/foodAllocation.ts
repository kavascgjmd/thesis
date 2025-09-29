import { query } from '../util';

export async function createFoodAllocationTable() {
    const createFoodAllocationTableQuery = `
       CREATE TABLE IF NOT EXISTS food_allocations (
  id SERIAL PRIMARY KEY,
  food_donation_id INTEGER REFERENCES food_donations(id),
  ngo_id INTEGER REFERENCES ngos(id),
  allocated_quantity DECIMAL(10,2),
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted BOOLEAN DEFAULT FALSE,
  pickup_scheduled BOOLEAN DEFAULT FALSE,
  pickup_completed BOOLEAN DEFAULT FALSE,
  allocation_status VARCHAR(50) DEFAULT 'PENDING'
);
    `;
    await query(createFoodAllocationTableQuery);
}
