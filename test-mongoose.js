require('dotenv').config();
const mongoose = require('mongoose');
const { InternalInvoice } = require('./models/InternalInvoice');

async function test() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartbuild');
    console.log("Connected");

    const invoice = await InternalInvoice.findOne();
    if (!invoice) {
        console.log("No invoices");
        process.exit();
    }

    const reqBody = {
        clientId: invoice.clientId.toString(),
        invoiceNo: invoice.invoiceNo,
        items: invoice.items.map(i => ({
            itemId: i.itemId.toString(),
            qty: i.qty.toString(), // string
            costAtSale: i.costAtSale.toString(), // string
            priceAtSale: i.priceAtSale.toString() // string
        })),
        grandTotal: invoice.grandTotal.toString() // string
    };

    try {
        const res = await InternalInvoice.findByIdAndUpdate(invoice._id, reqBody, { runValidators: true });
        console.log("Update success!");
    } catch (e) {
        console.error("Update failed:", e);
    }
    process.exit();
}
test();
