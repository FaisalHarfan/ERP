const models = require('../server/models');
(async () => {
    try {
        const list = await models.DeliveryOrder.findAll();
        console.log("Found", list.length, "delivery orders:");
        list.forEach(d => {
            const raw = d.toJSON();
            console.log(`ID: ${raw.id}, DO No: ${raw.do_number || raw.doNumber}, Status: ${raw.status}`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
