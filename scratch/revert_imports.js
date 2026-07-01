// scratch/revert_imports.js
require('dotenv').config();
const { Client } = require('pg');

async function revert() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        console.log('✅ Connected to database to revert changes.');

        const cutOffTime = '2026-06-27T02:14:00.000Z';

        const resCust = await client.query('DELETE FROM "customers" WHERE "created_at" >= $1', [cutOffTime]);
        console.log(`Deleted ${resCust.rowCount} customers.`);

        const resSupp = await client.query('DELETE FROM "suppliers" WHERE "created_at" >= $1', [cutOffTime]);
        console.log(`Deleted ${resSupp.rowCount} suppliers.`);

        const resItems = await client.query('DELETE FROM "inventory_items" WHERE "created_at" >= $1', [cutOffTime]);
        console.log(`Deleted ${resItems.rowCount} inventory items.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
revert();
