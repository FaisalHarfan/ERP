const sequelize = require('./server/config/database');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database...');

        // Add all columns to sales_returns (IF NOT EXISTS = safe to re-run)
        await sequelize.query(`
            ALTER TABLE sales_returns
              ADD COLUMN IF NOT EXISTS return_number VARCHAR(50),
              ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS so_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS so_number VARCHAR(50),
              ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS product_id VARCHAR(50),
              ADD COLUMN IF NOT EXISTS product_name VARCHAR(200),
              ADD COLUMN IF NOT EXISTS qty_returned NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS total_refund NUMERIC(15,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS condition VARCHAR(50),
              ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50),
              ADD COLUMN IF NOT EXISTS reason TEXT,
              ADD COLUMN IF NOT EXISTS notes TEXT,
              ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING',
              ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
              ADD COLUMN IF NOT EXISTS received_qty NUMERIC(15,2),
              ADD COLUMN IF NOT EXISTS received_condition VARCHAR(50),
              ADD COLUMN IF NOT EXISTS received_notes TEXT,
              ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'
        `);

        // Fix default status for existing records that are APPROVED → they were old format,
        // we keep them as-is. Just ensure new records default to PENDING.
        await sequelize.query(`
            ALTER TABLE sales_returns
              ALTER COLUMN status SET DEFAULT 'PENDING'
        `);

        console.log('✅ SUCCESS: sales_returns table migrated!');
        console.log('   Columns: all added, default status set to PENDING');
        process.exit(0);
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        process.exit(1);
    }
}

migrate();
