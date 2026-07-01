// scratch/check_db_count.js
require('dotenv').config();
const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        console.log('✅ Connected to database:', process.env.DB_NAME);

        // Get list of tables
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);

        console.log('\nTable counts:');
        for (const row of res.rows) {
            const table = row.table_name;
            try {
                const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                console.log(`- ${table}: ${countRes.rows[0].count} records`);
            } catch (err) {
                console.log(`- ${table}: Error (${err.message})`);
            }
        }
    } catch (err) {
        console.error('Error connecting or querying:', err);
    } finally {
        await client.end();
    }
}
check();
