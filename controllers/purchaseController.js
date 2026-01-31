const Purchase = require('../models/Purchase');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');
const { logAction } = require('../utils/logger');

// 1. Get All Purchases
exports.getPurchases = async (req, res) => {
    try {
        const { startDate, endDate, supplierTIN, page = 1 } = req.query;
        const limit = 15;
        const skip = (page - 1) * limit;

        let query = {};
        if (supplierTIN) {
            query.supplierTIN = { $regex: supplierTIN, $options: 'i' };
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const allFiltered = await Purchase.find(query).select('amountWithoutVAT vat totalAmount');
        const totals = allFiltered.reduce((acc, p) => {
            acc.net += p.amountWithoutVAT;
            acc.vat += p.vat;
            acc.total += p.totalAmount;
            return acc;
        }, { net: 0, vat: 0, total: 0 });

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
            supplierTIN,
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
            res.status(500).render("500",{
            layout:false,
            message:"Error loading purchases. something went wrong to our ends"
        });

    
    }
};

// 2. Import Purchases from CSV
exports.importPurchases = async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            const dateParts = data['Receipt issue date'].split('/');
            const formattedDate = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

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
                const docs = await Purchase.insertMany(results, { ordered: false });
                
                // AUDIT LOG: Successful Import
                await logAction(
                    req.user._id,
                    'IMPORT',
                    'PURCHASES',
                    'BULK_FILE',
                    `Successfully imported ${docs.length} RRA purchase records from CSV.`
                );
            } catch (err) {
                // If some were inserted but others were duplicates, we still log what worked
                const insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
                await logAction(
                    req.user._id,
                    'IMPORT',
                    'PURCHASES',
                    'BULK_FILE',
                    `Import completed. ${insertedCount} records added, duplicates were skipped.`
                );
            }
            fs.unlinkSync(req.file.path);
            res.redirect('/purchases');
        });
};

// 3. Export Purchases to CSV
exports.exportPurchasesCSV = async (req, res) => {
    try {
        const { startDate, endDate, supplierTIN } = req.query;
        let query = {};

        if (supplierTIN) query.supplierTIN = { $regex: supplierTIN, $options: 'i' };

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

        // AUDIT LOG: Export Action
        await logAction(
            req.user._id,
            'EXPORT',
            'PURCHASES',
            'CSV_FILE',
            `Exported ${purchases.length} purchase records to CSV format.`
        );

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
        const csvData = json2csvParser.parse(purchases);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Purchases_Report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csvData);

    } catch (err) {
        console.error(err);
       
            res.status(500).render("500",{
            layout:false,
            message:"Error exporting CSVs. something went wrong to our ends"
        });
    }
};

// 4. Delete All Purchases
exports.deleteAllPurchases = async (req, res) => {
    try {
        const count = await Purchase.countDocuments({});
        await Purchase.deleteMany({});
        
        // AUDIT LOG: Critical Action
        await logAction(
            req.user._id,
            'DELETE',
            'PURCHASES',
            'ALL_RECORDS',
            `User performed a bulk delete of ${count} imported RRA purchase records.`
        );
        
        res.redirect('/purchases');
    } catch (err) {
        console.error("Error during bulk delete:", err);
         res.status(500).render("500",{
            layout:false,
            message:"An error occurred while clearing the records. something went wrong to our ends"
        });
    }
};