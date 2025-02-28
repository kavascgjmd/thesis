import { query } from '../util';

export async function createCRMRecordTable() {
    const createCRMRecordTableQuery = `
        CREATE TABLE IF NOT EXISTS crm_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            interaction_type VARCHAR(50),
            interaction_date TIMESTAMP WITH TIME ZONE,
            notes TEXT
        );
    `;
    await query(createCRMRecordTableQuery);
}
