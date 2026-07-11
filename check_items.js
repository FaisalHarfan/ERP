const sequelize = require('./server/config/database');
const { InventoryItem } = require('./server/models');

async function check() {
  try {
    const items = await InventoryItem.findAll({
      attributes: ['itemCode', 'itemName', 'category', 'created_at'],
      order: [['category', 'ASC'], ['created_at', 'ASC']]
    });
    console.log(`Total items: ${items.length}`);
    items.forEach(i => console.log(`${(i.itemCode || 'NULL').padEnd(10)} | ${(i.category || 'NULL').padEnd(20)} | ${i.itemName}`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
