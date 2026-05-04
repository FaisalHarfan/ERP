// test_conn.js
require('dotenv').config();
const { Client } = require('pg');

async function test() {
    console.log(`Connecting to ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}...`);
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('✅ Connection Successful!');
    } catch (err) {
        console.log('❌ Connection Failed!');
        console.log('Error Code:', err.code);
        console.log('Error Message:', err.message);
        if (err.code === '28P01') console.log('Tip: Password salah.');
        if (err.code === 'ECONNREFUSED') console.log('Tip: PostgreSQL tidak berjalan atau Host/Port salah.');
    } finally {
        await client.end();
    }
}
test();
