const sequelize = require('./server/config/database');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database...');

        // Add all columns to product_exchanges (IF NOT EXISTS = safe to re-run)
        await sequelize.query(`
            ALTER TABLE product_exchanges
              ADD COLUMN IF NOT EXISTS exchange_number VARCHAR(50),
              ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS so_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS so_number VARCHAR(50),
              ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS returned_product_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS returned_product_name VARCHAR(200),
              ADD COLUMN IF NOT EXISTS returned_qty NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS replacement_product_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS replacement_product_name VARCHAR(200),
              ADD COLUMN IF NOT EXISTS replacement_qty NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS price_difference NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS reason TEXT,
              ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING',
              ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'
        `);

        // Fix default status
        await sequelize.query(`
            ALTER TABLE product_exchanges
              ALTER COLUMN status SET DEFAULT 'PENDING'
        `);

        console.log('✅ SUCCESS: product_exchanges table migrated!');
        console.log('   Columns: all added, default status set to PENDING');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    }
}

migrate();
