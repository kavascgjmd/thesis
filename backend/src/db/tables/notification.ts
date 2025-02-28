import { query } from '../util';

export async function createNotificationTable() {
    const createNotificationTableQuery = `
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            notification_type VARCHAR(50),
            notification_content TEXT,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT FALSE
        );
    `;
    await query(createNotificationTableQuery);
}
