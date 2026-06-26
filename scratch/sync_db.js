const { sequelize } = require('../server/models');

async function run() {
    console.log('🔄 Syncing database tables with alter: true...');
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Database sync complete. The account_types table should now be created.');
    } catch (err) {
        console.error('❌ Failed to sync database:', err.message);
    }
    process.exit(0);
}

run();
