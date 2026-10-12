require('dotenv').config({ path: './server/.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/unityerp' });
client.connect().then(async () => {
    const res = await client.query('SELECT id, data FROM production_orders LIMIT 3');
    console.log('Sample data:', JSON.stringify(res.rows, null, 2));
    const stages = await client.query("SELECT DISTINCT data->>'stage' as stage, data->>'status' as status, count(*) FROM production_orders GROUP BY stage, status");
    console.log('Stages:', stages.rows);
    client.end();
}).catch(e => console.error(e.message));
