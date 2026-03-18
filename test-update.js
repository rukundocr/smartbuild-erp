const mongoose = require('mongoose');
const { InternalInvoice, validateInternalInvoice } = require('./models/InternalInvoice');

const reqBody = {
    clientId: '60d5ecb5f1b53c1234567890',
    invoiceNo: 'INV-1234',
    grandTotal: '150',
    items: {
        '0': { itemId: '60d5ecb5f1b53c1234567891', qty: '1', priceAtSale: '100', costAtSale: '50' },
        '1': { itemId: '60d5ecb5f1b53c1234567892', qty: '1', priceAtSale: '50', costAtSale: '20' }
    }
};

const reqBody2 = {
    clientId: '60d5ecb5f1b53c1234567890',
    invoiceNo: 'INV-1234',
    grandTotal: '150',
    items: [
        { itemId: '60d5ecb5f1b53c1234567891', qty: '1', priceAtSale: '100', costAtSale: '50' },
        { itemId: '60d5ecb5f1b53c1234567892', qty: '1', priceAtSale: '50', costAtSale: '20' }
    ]
};

console.log("With Object items:", validateInternalInvoice(reqBody).error?.message);
console.log("With Array items:", validateInternalInvoice(reqBody2).error?.message);
