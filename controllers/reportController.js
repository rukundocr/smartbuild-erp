const RRASale = require('../models/RRASale');
const RRAPurchase = require('../models/Purchase');

exports.getVATSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};

        if (startDate || endDate) {
            query.date = {}; // Note: Ensure your models use consistent date field names or adjust here
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // Aggregate Sales (VAT Output)
        // Adjust field name to 'invoiceDate' if that's what RRASale uses
        const salesData = await RRASale.find(startDate || endDate ? { invoiceDate: query.date } : {});
        const totalOutput = salesData.reduce((acc, curr) => acc + (curr.vatAmount || 0), 0);

        // Aggregate Purchases (VAT Input)
        const purchaseData = await RRAPurchase.find(startDate || endDate ? { date: query.date } : {});
        const totalInput = purchaseData.reduce((acc, curr) => acc + (curr.vat || 0), 0);

        const vatPayable = totalOutput - totalInput;

        res.render('reports/vat-summary', {
            totalOutput,
            totalInput,
            vatPayable,
            startDate,
            endDate,
            title: 'VAT Declaration Summary'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error generating report");
    }
};