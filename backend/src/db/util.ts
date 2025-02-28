import pkg from 'pg';
const { Pool } = pkg;
export async function query(text: string, params?: any[]){
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}