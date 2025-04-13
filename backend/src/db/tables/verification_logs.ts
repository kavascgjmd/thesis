import { query } from '../util';

export async function createVerficationLogsTable() {
    const createVerficationLogsTableQuery = `
 CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'ngo', 'donor', or 'recipient'
    entity_id INTEGER NOT NULL,
    verified_by INTEGER REFERENCES users(id),
    verification_notes TEXT,
    status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `;
    try {
        await query(createVerficationLogsTableQuery);
        console.log('Recipient table created successfully');
    } catch (error) {
        console.error('Error creating recipient table:', error);
        throw error;
    }
}