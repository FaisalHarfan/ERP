const { sequelize, Account } = require('../server/models');

async function resetFinancials() {
    try {
        console.log('🔄 Syncing database schema...');
        await sequelize.sync({ alter: true });
        console.log('🔄 Starting financial and transaction reset...');
        
        // Tables to clear
        const tables = [
            'journal_entries',
            'payments',
            'supplier_payments',
            'sales_invoices',
            'purchase_invoices',
            'sales_orders',
            'purchase_orders',
            'stock_transactions',
            'stock_movements',
            'delivery_orders',
            'sales_returns',
            'product_exchanges',
            'daily_production_logs',
            'production_line_batches',
            'manufacturing_orders',
            'production_orders'
        ];

        for (const table of tables) {
            try {
                await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`);
                console.log(`- Cleared table: ${table}`);
            } catch (e) {
                console.log(`- Table ${table} skip or error: ${e.message}`);
            }
        }

        // Reset all Accounts to blank slate
        const accounts = await Account.findAll();
        for (const acc of accounts) {
            await acc.update({
                name: '',
                opening_balance: 0,
                parentId: null,
                isGroup: false
            });
            console.log(`- Reset Account Code: ${acc.code}`);
        }

        console.log('\n✅ All financial transactions reset to 0 and COA accounts cleared successfully!');

    } catch (e) {
        console.error('Error during reset:', e);
    } finally {
        process.exit();
    }
}

resetFinancials();
