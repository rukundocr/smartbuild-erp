const Purchase = require('../models/Purchase');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');
const { logAction } = require('../utils/logger');

// 1. Get All Purchases
exports.getPurchases = async (req, res) => {
    try {
        const { startDate, endDate, supplierTIN } = req.query;
        // NEW: Get the total count of every single record in the database before filtering
        const totalImportedAllTime = await Purchase.countDocuments();

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

        const purchases = await Purchase.find(query)
            .sort({ date: -1 })
            .lean();

        // Read cancelled invoices from flash (set by importPurchases)
        const flashData = req.flash('cancelled_invoices');
        let cancelledInvoices = null;
        if (flashData && flashData.length > 0) {
            try { cancelledInvoices = JSON.parse(flashData[0]); } catch (e) { cancelledInvoices = null; }
        }

        res.render('purchases', {
            purchases,
            totals,
            totalImportedAllTime,
            filteredCount: purchases.length,
            startDate,
            endDate,
            supplierTIN,
            cancelledInvoices  // passed to view for popup
        });

    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: "Error loading purchases. something went wrong to our ends"
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
                // --- STEP 1: Detect missing records ---
                const incomingReceiptNumbers = new Set(results.map(r => r.receiptNumber));

                // Fetch all existing records from DB
                const existingRecords = await Purchase.find({}, {
                    receiptNumber: 1, supplierName: 1, supplierTIN: 1,
                    natureOfGoods: 1, date: 1, amountWithoutVAT: 1, vat: 1, totalAmount: 1
                }).lean();

                // Records in DB but NOT in the new CSV = likely cancelled invoices
                const missingRecords = existingRecords.filter(r => !incomingReceiptNumbers.has(r.receiptNumber));

                // --- STEP 2: Delete each missing record and log with full details ---
                const cancelledInvoices = [];
                for (const missing of missingRecords) {
                    await Purchase.findByIdAndDelete(missing._id);

                    const dateStr = missing.date ? new Date(missing.date).toLocaleDateString('en-GB') : 'N/A';
                    await logAction(
                        req.user._id,
                        'WARNING',
                        'PURCHASES',
                        missing._id,
                        `CANCELLED INVOICE — Receipt #${missing.receiptNumber} | Supplier: "${missing.supplierName}" (TIN: ${missing.supplierTIN}) | Goods: ${missing.natureOfGoods || 'N/A'} | Date: ${dateStr} | Net: ${missing.amountWithoutVAT.toLocaleString()} RWF | VAT: ${missing.vat.toLocaleString()} RWF | Total: ${missing.totalAmount.toLocaleString()} RWF — Present in system but MISSING from new CSV. Auto-deleted.`
                    );

                    cancelledInvoices.push({
                        receiptNumber: missing.receiptNumber,
                        supplierName: missing.supplierName,
                        supplierTIN: missing.supplierTIN,
                        natureOfGoods: missing.natureOfGoods || 'N/A',
                        date: dateStr,
                        amountWithoutVAT: missing.amountWithoutVAT.toLocaleString(),
                        vat: missing.vat.toLocaleString(),
                        totalAmount: missing.totalAmount.toLocaleString()
                    });
                }

                // --- STEP 3: Store cancelled list in flash for popup ---
                if (cancelledInvoices.length > 0) {
                    req.flash('cancelled_invoices', JSON.stringify(cancelledInvoices));
                }

                // --- STEP 4: Insert new records (duplicates skipped) ---
                let insertedCount = 0;
                try {
                    const docs = await Purchase.insertMany(results, { ordered: false });
                    insertedCount = docs.length;
                } catch (insertErr) {
                    insertedCount = insertErr.insertedDocs ? insertErr.insertedDocs.length : 0;
                }

                await logAction(
                    req.user._id,
                    'IMPORT',
                    'PURCHASES',
                    'BULK_FILE',
                    `Import complete: ${insertedCount} new record(s) added. ${missingRecords.length > 0 ? missingRecords.length + ' cancelled invoice(s) auto-deleted and logged as WARNING.' : 'No missing records detected.'}`
                );

            } catch (err) {
                console.error('Import error:', err);
            }

            fs.unlinkSync(req.file.path);
            req.session.save(() => {
                res.redirect('/purchases');
            });
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

        res.status(500).render("500", {
            layout: false,
            message: "Error exporting CSVs. something went wrong to our ends"
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
        res.status(500).render("500", {
            layout: false,
            message: "An error occurred while clearing the records. something went wrong to our ends"
        });
    }
};

