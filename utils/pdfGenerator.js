// utils/pdfGenerator.js
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateExpensePDF = (expenses, projectName, totalAmount) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("SMARTBUILD ERP - EXPENSE REPORT", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Project: ${projectName} | Total: ${totalAmount.toLocaleString()} RWF`, 14, 28);

    // Map data to include the separate Phone column
    const tableData = expenses.map(exp => [
        new Date(exp.date).toLocaleDateString('en-GB'),
        exp.projectId ? exp.projectId.projectName : 'N/A',
        `${exp.reason} (${exp.mode})`,
        exp.name,
        exp.recipientPhone, // Separate Column in PDF
        `${exp.amount.toLocaleString()} RWF`
    ]);

    autoTable(doc, {
        startY: 35,
        head: [['DATE', 'PROJECT', 'DESCRIPTION', 'RECIPIENT', 'PHONE', 'AMOUNT']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253] },
        styles: { fontSize: 8 }
    });

    return doc.output('arraybuffer');
};

module.exports = { generateExpensePDF };