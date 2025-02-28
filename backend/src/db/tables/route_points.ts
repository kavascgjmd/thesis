import { query } from '../util';

export async function createRoutePointsTable() {
    const createRoutePointsTableQuery = `
        CREATE TABLE IF NOT EXISTS route_points (
            id SERIAL PRIMARY KEY,
            route_id INTEGER REFERENCES delivery_routes(id) ON DELETE CASCADE,
            point_order INTEGER NOT NULL,
            point_type VARCHAR(20) NOT NULL, -- 'pickup' or 'delivery'
            location_id INTEGER, -- ID of the donor or NGO
            latitude DECIMAL(10, 6) NOT NULL,
            longitude DECIMAL(10, 6) NOT NULL,
            address TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await query(createRoutePointsTableQuery);
}
