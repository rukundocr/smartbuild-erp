const RRASale = require('../models/RRASale');
const RRAPurchase = require('../models/Purchase');
const CasualPayment = require('../models/CasualPayment');

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

        // 1. VAT Output (Collected from Sales)
        const salesQuery = (startDate || endDate) ? { invoiceDate: dateFilter } : {};
        const salesData = await RRASale.find(salesQuery);
        const totalOutput = salesData.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);

        // 2. VAT Input (Paid for Purchases)
        const purchaseQuery = (startDate || endDate) ? { date: dateFilter } : {};
        const purchaseData = await RRAPurchase.find(purchaseQuery);
        const totalInput = purchaseData.reduce((acc, curr) => acc + (curr.vat || 0), 0);

        // 3. Withholding Tax (WHT 15% from Workers)
        const whtQuery = (startDate || endDate) ? { date: dateFilter } : {};
        const casualData = await CasualPayment.find(whtQuery);
        const totalWHT = casualData.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

        // VAT Position (Can be positive [Payable] or negative [Credit])
        const vatPayable = totalOutput - totalInput;

        // Total Remittance = (Net VAT) + (WHT)
        // Even if you have a VAT credit, you MUST pay the WHT collected from workers.
        const totalTaxLiability = vatPayable + totalWHT;

        res.render('reports/vat-summary', {
            totalOutput,
            totalInput,
            vatPayable,
            totalWHT,
            totalTaxLiability,
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