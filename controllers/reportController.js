const RRASale = require('../models/RRASale');
const RRAPurchase = require('../models/Purchase');
const CasualPayment = require('../models/CasualPayment'); // Import the casual payments model

exports.getVATSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};

        if (startDate || endDate) {
            dateFilter = {};
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        }

        // 1. Aggregate Sales (VAT Output)
        const salesQuery = (startDate || endDate) ? { invoiceDate: dateFilter } : {};
        const salesData = await RRASale.find(salesQuery);
        const totalOutput = salesData.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);

        // 2. Aggregate Purchases (VAT Input)
        const purchaseQuery = (startDate || endDate) ? { date: dateFilter } : {};
        const purchaseData = await RRAPurchase.find(purchaseQuery);
        const totalInput = purchaseData.reduce((acc, curr) => acc + (curr.vat || 0), 0);

        // 3. Aggregate Withholding Tax (WHT) from Casual Workers
        const whtQuery = (startDate || endDate) ? { date: dateFilter } : {};
        const casualData = await CasualPayment.find(whtQuery);
        const totalWHT = casualData.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

        const vatPayable = totalOutput - totalInput;
        // Total Tax Liability for the period
        const totalTaxLiability = vatPayable + totalWHT;

        res.render('reports/vat-summary', {
            totalOutput,
            totalInput,
            vatPayable,
            totalWHT, // New variable
            totalTaxLiability, // Combined VAT + WHT
            startDate,
            endDate,
            title: 'Tax Declaration Summary'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render("500", {
            layout: false,
            message: 'Error occurred while loading Tax Summary.' 
        });
    }
};