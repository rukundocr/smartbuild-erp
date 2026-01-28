const RRASale = require('../models/RRASale');
const Project = require('../models/Project');
const csv = require('csv-parser');
const fs = require('fs');
const { Parser } = require('json2csv');
const { logAction } = require('../utils/logger');

exports.getSalesPage = async (req, res) => {
    try {
        const { startDate, endDate, buyerTIN, projectId, page = 1 } = req.query;
        const limit = 15;
        const skip = (page - 1) * limit;

        let query = {};
        if (buyerTIN) query.buyerTIN = { $regex: buyerTIN, $options: 'i' };
        if (projectId && projectId !== "") query.projectId = projectId;

        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.invoiceDate.$lte = end;
            }
        }

        const allFiltered = await RRASale.find(query).select('totalAmountExclVAT vatAmount');
        const totals = allFiltered.reduce((acc, s) => {
            acc.net += s.totalAmountExclVAT || 0;
            acc.vat += s.vatAmount || 0;
            acc.total += (s.totalAmountExclVAT + s.vatAmount) || 0;
            return acc;
        }, { net: 0, vat: 0, total: 0 });

        const totalSales = await RRASale.countDocuments(query);
        const totalPages = Math.ceil(totalSales / limit);

        const sales = await RRASale.find(query)
            .populate('projectId')
            .sort({ invoiceDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const projects = await Project.find().lean();

        res.render('sales', { 
            sales, 
            projects, 
            totals,
            startDate,
            endDate,
            buyerTIN,
            projectId,
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
        console.error("Error loading sales page:", err);
        res.status(500).send("Error loading sales page");
    }
};

exports.importCSVSales = async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            const cleanNum = (val) => {
                if (!val) return 0;
                return parseFloat(val.toString().replace(/,/g, '').replace(/"/g, '')) || 0;
            };

            let importedCount = 0;
            for (const row of results) {
                try {
                    const receiptNo = row['Receipt Number'];
                    if (!receiptNo) continue;

                    const exists = await RRASale.findOne({ receiptNumber: receiptNo });
                    if (!exists) {
                        const d = row['Invoice Date'].split('/');
                        const formattedDate = new Date(`${d[2]}-${d[1]}-${d[0]}`);

                        await RRASale.create({
                            buyerTIN: row['Buyer TIN'],
                            buyerName: row['Buyer Name'],
                            natureOfGoods: row['Nature of Goods'],
                            receiptNumber: receiptNo,
                            invoiceDate: formattedDate,
                            totalAmountExclVAT: cleanNum(row['Total Amount of Sales (VAT Exclusive)']),
                            taxableSales: cleanNum(row['Taxble Sales']),
                            vatAmount: cleanNum(row['VAT'])
                        });
                        importedCount++;
                    }
                } catch (e) { 
                    console.error("Error parsing row during import:", e); 
                }
            }

            // SOLID AUDIT LOG
            await logAction(
                req.user._id,
                'IMPORT',
                'SALES',
                'CSV_BATCH',
                `Imported ${importedCount} RRA sales records from CSV file.`
            );

            fs.unlinkSync(req.file.path);
            res.redirect('/rra-sales');
        });
};

exports.exportSalesCSV = async (req, res) => {
    try {
        const { startDate, endDate, buyerTIN, projectId } = req.query;
        let query = {};

        if (buyerTIN) query.buyerTIN = { $regex: buyerTIN, $options: 'i' };
        if (projectId && projectId !== "") query.projectId = projectId;
        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.invoiceDate.$lte = end;
            }
        }

        const sales = await RRASale.find(query).populate('projectId').sort({ invoiceDate: -1 }).lean();
        
        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'EXPORT',
            'SALES',
            'CSV_FILE',
            `User exported ${sales.length} sales records to CSV.`
        );

        const fields = [
            { label: 'Date', value: (row) => row.invoiceDate ? row.invoiceDate.toLocaleDateString() : '' },
            { label: 'Buyer TIN', value: 'buyerTIN' },
            { label: 'Buyer Name', value: 'buyerName' },
            { label: 'Receipt Number', value: 'receiptNumber' },
            { label: 'Net Amount', value: 'totalAmountExclVAT' },
            { label: 'VAT', value: 'vatAmount' },
            { label: 'Project', value: (row) => row.projectId ? row.projectId.projectName : 'Unlinked' }
        ];

        const json2csvParser = new Parser({ fields });
        const csvData = json2csvParser.parse(sales);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvData);
    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).send("Export failed");
    }
};

exports.deleteAllSales = async (req, res) => {
    try {
        const count = await RRASale.countDocuments({});
        await RRASale.deleteMany({});
        
        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'DELETE',
            'SALES',
            'ALL_RECORDS',
            `User performed a bulk delete of ${count} RRA sales records.`
        );
        
        res.redirect('/rra-sales');
    } catch (err) {
        console.error("Delete All Error:", err);
        res.status(500).send("Delete failed");
    }
};

exports.linkProject = async (req, res) => {
    try {
        const sale = await RRASale.findByIdAndUpdate(req.params.id, { projectId: req.body.projectId }, { new: true }).populate('projectId');
        
        // SOLID AUDIT LOG
        await logAction(
            req.user._id,
            'UPDATE',
            'SALES',
            sale._id,
            `Linked Sale Receipt #${sale.receiptNumber} to project: ${sale.projectId.projectName}`
        );

        res.redirect('/rra-sales');
    } catch (err) {
        console.error("Linking Error:", err);
        res.status(500).send("Failed to link project");
    }
};