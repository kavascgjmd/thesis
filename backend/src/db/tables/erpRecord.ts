import { query } from '../util';

export async function createERPRecordTable() {
    const createERPRecordTableQuery = `
        CREATE TABLE IF NOT EXISTS erp_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            operation_type VARCHAR(50),
            operation_date TIMESTAMP WITH TIME ZONE,
            resource_details TEXT,
            notes TEXT
        );
    `;
    await query(createERPRecordTableQuery);
}
