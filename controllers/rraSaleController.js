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

        // Filter by Buyer TIN
        if (buyerTIN) {
            query.buyerTIN = { $regex: buyerTIN, $options: 'i' };
        }

        // Filter by Project
        if (projectId && projectId !== "") {
            query.projectId = projectId;
        }

        // Filter by Date Range
        if (startDate || endDate) {
            query.invoiceDate = {};
            if (startDate) query.invoiceDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.invoiceDate.$lte = end;
            }
        }

        // Calculate Totals for the filtered results
        const allFiltered = await RRASale.find(query).select('totalAmountExclVAT vatAmount');
        const totals = allFiltered.reduce((acc, s) => {
            acc.net += s.totalAmountExclVAT || 0;
            acc.vat += s.vatAmount || 0;
            acc.total += (s.totalAmountExclVAT + s.vatAmount) || 0;
            return acc;
        }, { net: 0, vat: 0, total: 0 });

        // Get paginated results
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
            projectId, // Needed for keeping the dropdown selected in UI
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

            let imported = 0;
            for (const row of results) {
                try {
                    const receiptNo = row['Receipt Number'];
                    if (!receiptNo) continue;

                    const exists = await RRASale.findOne({ receiptNumber: receiptNo });
                    if (!exists) {
                        const d = row['Invoice Date'].split('/');
                        // Expected format DD/MM/YYYY
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
                        imported++;
                    }
                } catch (e) { 
                    console.error("Error parsing row during import:", e); 
                }
            }
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
        await RRASale.deleteMany({});
        await logAction("CLEAR_ALL", "Sales", "Bulk delete of all imported RRA sales records.");
        res.redirect('/rra-sales');
    } catch (err) {
        console.error("Delete All Error:", err);
        res.status(500).send("Delete failed");
    }
};

exports.linkProject = async (req, res) => {
    try {
        await RRASale.findByIdAndUpdate(req.params.id, { projectId: req.body.projectId });
        res.redirect('/rra-sales');
    } catch (err) {
        console.error("Linking Error:", err);
        res.status(500).send("Failed to link project");
    }
};