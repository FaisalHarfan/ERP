const { sequelize } = require('./server/models');

async function checkRaw() {
    try {
        const [results, metadata] = await sequelize.query("SELECT * FROM inventory_items WHERE item_name LIKE '%Tani%';");
        console.log('Raw data from DB:');
        results.forEach(row => {
            console.log(row);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkRaw();
