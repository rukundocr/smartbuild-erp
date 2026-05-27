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
        let totalSales = salesData.reduce((acc, curr) => acc + ((curr.totalAmountExclVAT || 0) + (curr.vatAmount || 0)), 0);
        const totalPurchases = purchaseData.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

        const annualProfit = totalSales - (totalPurchases + totalWHT);
        let citTax = annualProfit > 0 ? annualProfit * 0.28 : 0;

        // Temporary dynamic calculation for selected year 2025
        if (selectedYear === 2025) {
            totalSales = salesData.reduce((acc, curr) => acc + (curr.totalAmountExclVAT || 0), 0);
            citTax = totalSales * 0.03;
        }

        // --- IQP TAX CALCULATION (Method 2: Turnover Ratio) ---
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
        const iqpQuarter = req.query.iqpQuarter ? parseInt(req.query.iqpQuarter) : currentQuarter;
        const iqpYear = req.query.iqpYear ? parseInt(req.query.iqpYear) : selectedYear;

        // 1. Calculate Previous Year's Data (for iqpYear - 1)
        const prevYearStart = new Date(iqpYear - 1, 0, 1);
        const prevYearEnd = new Date(iqpYear - 1, 11, 31, 23, 59, 59, 999);

        const prevYearSalesData = await RRASale.find({ invoiceDate: { $gte: prevYearStart, $lte: prevYearEnd } });
        const prevYearPurchaseData = await RRAPurchase.find({ date: { $gte: prevYearStart, $lte: prevYearEnd } });
        const prevYearCasualData = await CasualPayment.find({ date: { $gte: prevYearStart, $lte: prevYearEnd } });

        let prevYearSales = prevYearSalesData.reduce((acc, curr) => acc + (curr.totalAmountExclVAT || 0), 0);
        const prevYearPurchases = prevYearPurchaseData.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const prevYearWHT = prevYearCasualData.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);

        const prevYearProfit = prevYearSales - (prevYearPurchases + prevYearWHT);
        let prevYearCIT = prevYearProfit > 0 ? prevYearProfit * 0.28 : 0;

        // Temporary dynamic calculation for 2025 previous year data (e.g., when calculating for 2026)
        if (iqpYear - 1 === 2025) {
            prevYearCIT = prevYearSales * 0.03;
        }

        // 2. Calculate Current Quarter's Sales (for iqpYear & iqpQuarter)
        let iqpStartDate, iqpEndDate;
        if (iqpQuarter === 1) {
            iqpStartDate = new Date(iqpYear, 0, 1);
            iqpEndDate = new Date(iqpYear, 2, 31, 23, 59, 59, 999);
        } else if (iqpQuarter === 2) {
            iqpStartDate = new Date(iqpYear, 3, 1);
            iqpEndDate = new Date(iqpYear, 5, 30, 23, 59, 59, 999);
        } else if (iqpQuarter === 3) {
            iqpStartDate = new Date(iqpYear, 6, 1);
            iqpEndDate = new Date(iqpYear, 8, 30, 23, 59, 59, 999);
        } else {
            iqpStartDate = new Date(iqpYear, 9, 1);
            iqpEndDate = new Date(iqpYear, 11, 31, 23, 59, 59, 999);
        }

        const currQuarterSalesData = await RRASale.find({ invoiceDate: { $gte: iqpStartDate, $lte: iqpEndDate } });
        const currQuarterSales = currQuarterSalesData.reduce((acc, curr) => acc + (curr.totalAmountExclVAT || 0), 0);

        // 3. Compute IQP Prepayment Tax (Method 2: Ratio of CIT to Sales)
        const iqpRatio = prevYearSales > 0 ? (prevYearCIT / prevYearSales) : 0;
        const iqpTax = iqpRatio * currQuarterSales;

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
            iqpYear,
            prevIqpYear: iqpYear - 1,
            iqpQuarter,
            prevYearSales,
            prevYearCIT,
            currQuarterSales,
            iqpRatioPercent: (iqpRatio * 100).toFixed(2),
            iqpTax,
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