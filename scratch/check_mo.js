const { ProductionOrder } = require('../server/models');

async function main() {
    try {
        const mo = await ProductionOrder.findByPk('eba9d121-4c24-43b2-a18a-922149b80474');
        if (mo) {
            console.log(JSON.stringify(mo.toJSON(), null, 2));
        } else {
            console.log('MO eba9d121-4c24-43b2-a18a-922149b80474 not found!');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
