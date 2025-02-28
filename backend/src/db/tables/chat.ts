import { query } from '../util';

export async function createChatTable() {
    const createChatTableQuery = `
        CREATE TABLE IF NOT EXISTS chats (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            related_entity_id INTEGER,
            entity_type VARCHAR(50),
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            message_content TEXT
        );
    `;
    await query(createChatTableQuery);
}
