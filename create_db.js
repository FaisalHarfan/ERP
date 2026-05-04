// create_db.js
require('dotenv').config();
const { Client } = require('pg');

async function createDb() {
    // Connect to 'postgres' default database first
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL (postgres database)');
        
        await client.query('CREATE DATABASE unityerp');
        console.log('✅ Database "unityerp" created successfully!');
    } catch (err) {
        if (err.code === '42P04') {
            console.log('ℹ️ Database "unityerp" already exists.');
        } else {
            console.error('❌ Error creating database:', err.message);
            console.log('\nTip: Pastikan password di file .env sudah benar.');
        }
    } finally {
        await client.end();
    }
}

createDb();
