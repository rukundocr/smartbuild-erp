const RRASale = require('../models/RRASale');
const RRAPurchase = require('../models/Purchase');
const CasualPayment = require('../models/CasualPayment');
const { logAction } = require('../utils/logger');

exports.getVATSummary = async (req, res) => {
    try {
        const { startDate, endDate, year } = req.query;
        let dateFilter = {};

        const selectedYear = year ? parseInt(year) : new Date().getFullYear();

        if (startDate || endDate) {
            if (startDate) dateFilter.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        } else {
            // Default to Yearly Filter (Jan 1st to Dec 31st)
            dateFilter.$gte = new Date(selectedYear, 0, 1);
            const endOfYear = new Date(selectedYear, 11, 31);
            endOfYear.setHours(23, 59, 59, 999);
            dateFilter.$lte = endOfYear;
        }

        // 1. VAT Output (Collected from Sales)
        const salesData = await RRASale.find({ invoiceDate: dateFilter });
        const totalOutput = salesData.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);

        // 2. VAT Input (Paid for Purchases)
        const purchaseData = await RRAPurchase.find({ date: dateFilter });
        const totalInput = purchaseData.reduce((acc, curr) => acc + (curr.vat || 0), 0);

        // 3. Withholding Tax (WHT 15% from Workers)
        const casualData = await CasualPayment.find({ date: dateFilter });
        const totalWHT = casualData.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

        // VAT Position (Can be positive [Payable] or negative [Credit])
        const vatPayable = totalOutput - totalInput;

        // Total Remittance = (Net VAT) + (WHT)
        const totalTaxLiability = vatPayable + totalWHT;

        // CIT TAX Calculation (28% of Annual Profit)
        const totalSales = salesData.reduce((acc, curr) => acc + ((curr.totalAmountExclVAT || 0) + (curr.vatAmount || 0)), 0);
        const totalPurchases = purchaseData.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

        const annualProfit = totalSales - (totalPurchases + totalWHT);
        const citTax = annualProfit > 0 ? annualProfit * 0.28 : 0;

        await logAction(
            req.user._id,
            'EXPORT',
            'REPORTS',
            'VAT_SUMMARY',
            `Generated VAT/Tax Summary Report. Output: ${totalOutput.toLocaleString()} RWF, Input: ${totalInput.toLocaleString()} RWF, Net Payable: ${vatPayable.toLocaleString()} RWF`
        );

        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

        res.render('reports/vat-summary', {
            totalOutput,
            totalInput,
            vatPayable,
            totalWHT,
            totalTaxLiability,
            totalSales,
            totalPurchases,
            annualProfit,
            citTax,
            startDate,
            endDate,
            selectedYear,
            years,
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

exports.getVatTrend = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trendData = await TaxTrend.find({
            date: { $gte: thirtyDaysAgo }
        }).sort({ date: 1 }).lean();

        res.json(trendData);
    } catch (err) {
        console.error("Error fetching VAT trend:", err);
        res.status(500).json({ error: "Failed to fetch trend data" });
    }
};