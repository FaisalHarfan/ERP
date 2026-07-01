// scratch/list_databases.js
require('dotenv').config();
const { Client } = require('pg');

async function list() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log('Databases in PostgreSQL:', res.rows.map(r => r.datname));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
list();
