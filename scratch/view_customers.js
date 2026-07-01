// scratch/view_customers.js
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
        const res = await client.query('SELECT id, name FROM "customers"');
        console.log('Customers in DB:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
