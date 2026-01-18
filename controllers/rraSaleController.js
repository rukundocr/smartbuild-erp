const RRASale = require('../models/RRASale');
const Project = require('../models/Project');
const csv = require('csv-parser');
const fs = require('fs');

exports.getSalesPage = async (req, res) => {
    try {
        const sales = await RRASale.find().populate('projectId').sort({ invoiceDate: -1 });
        const projects = await Project.find();
        
        // CHANGED: Removed 'rraSales/' prefix
        res.render('sales', { 
            sales, 
            projects, 
            title: 'RRA Sales Report' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading sales page");
    }
};

exports.importCSVSales = async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const results = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let imported = 0;
            let skipped = 0;

            for (const row of results) {
                try {
                    // Logic to handle "19,980,000" or "2,656,319.49"
                    const cleanNum = (val) => {
                        if (!val) return 0;
                        return parseFloat(val.toString().replace(/,/g, '').replace(/"/g, '')) || 0;
                    };
                    
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
                        imported++;
                    } else {
                        skipped++;
                    }
                } catch (e) {
                    console.error("Error parsing row:", e);
                }
            }
            fs.unlinkSync(filePath); 
            req.flash('success_msg', `Successfully imported ${imported} records.`);
            res.redirect('/rra-sales');
        });
};

exports.linkProject = async (req, res) => {
    await RRASale.findByIdAndUpdate(req.params.id, { projectId: req.body.projectId });
    res.redirect('/rra-sales');
};