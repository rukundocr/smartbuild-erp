const Purchase = require('../models/Purchase');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');

const { logAction } = require('../utils/logger');

exports.getPurchases = async (req, res) => {
    try {
        const { startDate, endDate, page = 1 } = req.query;
        const limit = 15;
        const skip = (page - 1) * limit;

        let query = {};
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // 1. Get Totals for the entire filter (not just the page)
        const allFiltered = await Purchase.find(query).select('amountWithoutVAT vat totalAmount');
        const totals = allFiltered.reduce((acc, p) => {
            acc.net += p.amountWithoutVAT;
            acc.vat += p.vat;
            acc.total += p.totalAmount;
            return acc;
        }, { net: 0, vat: 0, total: 0 });

        // 2. Get Paginated Results
        const totalPurchases = await Purchase.countDocuments(query);
        const totalPages = Math.ceil(totalPurchases / limit);

        const purchases = await Purchase.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('purchases', { 
            purchases, 
            totals, 
            startDate, 
            endDate,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                prevPage: parseInt(page) - 1,
                nextPage: parseInt(page) + 1
            }
        });
    } catch (err) {
        res.status(500).send("Error loading purchases");
    }
};

exports.importPurchases = async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            // Parse Date DD/MM/YYYY to JS Date
            const dateParts = data['Receipt issue date'].split('/');
            const formattedDate = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

            // Clean numbers (remove commas)
            const netAmount = parseFloat(data['Amount without VAT'].replace(/,/g, ''));
            const vatAmount = parseFloat(data['VAT'].toString().replace(/,/g, ''));

            results.push({
                supplierTIN: data['Supplier TIN'],
                supplierName: data['Supplier name'],
                natureOfGoods: data['Nature of Goods'],
                receiptNumber: data['Receipt number'],
                date: formattedDate,
                amountWithoutVAT: netAmount,
                vat: vatAmount,
                totalAmount: netAmount + vatAmount
            });
        })
        .on('end', async () => {
            try {
                // Use insertMany with ordered: false to skip duplicates based on unique receiptNumber
                await Purchase.insertMany(results, { ordered: false });
            } catch (err) {
                console.log("Some duplicates were skipped");
            }
            fs.unlinkSync(req.file.path); // Delete temp file
            res.redirect('/purchases');
        });
};




exports.exportPurchasesCSV = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const purchases = await Purchase.find(query).sort({ date: -1 }).lean();

        // Define CSV Columns
        const fields = [
            { label: 'Date', value: (row) => row.date.toLocaleDateString() },
            { label: 'Supplier TIN', value: 'supplierTIN' },
            { label: 'Supplier Name', value: 'supplierName' },
            { label: 'Receipt Number', value: 'receiptNumber' },
            { label: 'Amount (No VAT)', value: 'amountWithoutVAT' },
            { label: 'VAT', value: 'vat' },
            { label: 'Total Amount', value: 'totalAmount' }
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(purchases);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Purchases_Report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error exporting CSV");
    }
};

// Delete All Purchases


// Delete All Purchases with Audit Logging
exports.deleteAllPurchases = async (req, res) => {
    try {
        // 1. Clear the database
        await Purchase.deleteMany({});
        
        // 2. Record the action in the Audit Log
        await logAction(
            "CLEAR_ALL", 
            "Purchases", 
            "User performed a bulk delete of all imported RRA purchase records."
        );
        
        // 3. Redirect back to the page
        res.redirect('/purchases');
    } catch (err) {
        // 4. Proper error handling
        console.error("Error during bulk delete:", err);
        res.status(500).send("An error occurred while clearing the records.");
    }
};