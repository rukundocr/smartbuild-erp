const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateInternalSummaryPDF = async (invoices, stats, dateRange) => {
    const doc = new jsPDF();
    const now = new Date();

    // 1. Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTBUILD LTD", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Internal Sales Summary Report", 14, 27);

    // Date Range Info
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    const rangeText = (dateRange.startDate || dateRange.endDate)
        ? `Interval: ${dateRange.startDate || 'Beginning'} to ${dateRange.endDate || 'Today'}`
        : "Interval: All Time Records";
    doc.text(rangeText, 14, 35);

    doc.line(14, 38, 196, 38);

    // 2. Financial Summary Box
    doc.setFontSize(12);
    doc.text("FINANCIAL PERFORMANCE", 14, 48);

    autoTable(doc, {
        startY: 52,
        head: [['Metric', 'Amount (RWF)']],
        body: [
            ['Total Revenue', stats.totalRevenue.toLocaleString()],
            ['Total Cost of Goods', stats.totalCost.toLocaleString()],
            ['Net Profit', stats.netProfit.toLocaleString()]
        ],
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 11, cellPadding: 3 }
    });

    // 3. Detailed Invoices Table
    doc.setFontSize(12);
    doc.text("DETAILED TRANSACTIONS", 14, doc.lastAutoTable.finalY + 15);

    const tableData = invoices.map(inv => [
        new Date(inv.date).toLocaleDateString('en-GB'),
        inv.invoiceNo,
        inv.clientId.clientName,
        inv.items.length,
        inv.grandTotal.toLocaleString(),
        inv.status
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Invoice No', 'Client', 'Items', 'Total (RWF)', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        styles: { fontSize: 9 }
    });

    // 4. Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    const timestamp = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    doc.text(timestamp, 14, 285);
    doc.text("Electronic summary report generated for internal management use.", 14, 290);

    return doc.output('arraybuffer');
};

module.exports = { generateInternalSummaryPDF };
