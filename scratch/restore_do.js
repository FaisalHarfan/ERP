const models = require('../server/models');
(async () => {
    try {
        const id = '1780971124728yh93d';
        console.log("Restoring Delivery Order with ID:", id, "back to PENDING...");
        const record = await models.DeliveryOrder.findByPk(id);
        if (record) {
            await record.update({ status: 'PENDING' });
            console.log("Successfully restored back to PENDING!");
        } else {
            console.error("Delivery Order not found");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
