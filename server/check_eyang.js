const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/erp', { logging: false });
const InventoryItem = sequelize.define('inventory_items', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    category: DataTypes.STRING(50),
    itemName: { type: DataTypes.STRING(200), field: 'item_name' },
    status: DataTypes.STRING(20)
}, { timestamps: false });
const StockTransaction = sequelize.define('stock_transactions', {
    id: { type: DataTypes.STRING(50), primaryKey: true },
    itemId: { type: DataTypes.STRING(50), field: 'item_id' },
    itemName: { type: DataTypes.STRING(200), field: 'item_name' },
    qty: DataTypes.DECIMAL(15, 2)
}, { timestamps: false });

async function check() {
    const items = await InventoryItem.findAll({
        where: { itemName: { [Op.iLike]: '%eyang tani%' } },
        raw: true
    });
    console.log("=== ITEMS ===");
    console.log(items.map(i => `${i.id} | ${i.itemName} | ${i.category} | ${i.status}`));
    
    const txs = await StockTransaction.findAll({
        where: { itemName: { [Op.iLike]: '%eyang tani%' } },
        raw: true
    });
    console.log("=== TRANSACTIONS ===");
    console.log(txs.map(t => `${t.itemId} | ${t.itemName} | qty: ${t.qty}`));
    process.exit(0);
}
check();
