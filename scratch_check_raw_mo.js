const { sequelize } = require('./server/models');

async function checkRawMO() {
    try {
        const [results] = await sequelize.query("SELECT * FROM production_orders LIMIT 1;");
        console.log('Raw data from production_orders:');
        console.log(results[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkRawMO();
