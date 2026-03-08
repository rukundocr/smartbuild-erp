const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateInternalPDF = async (invoice) => {
    const doc = new jsPDF();
    const now = new Date();

    // 1. Company Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTBUILD LTD", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Internal Inventory Supply Receipt", 14, 27);
    doc.text("Kigali, Rwanda | +250 785193526", 14, 32);

    // 2. Invoice Meta Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`INVOICE NO: ${invoice.invoiceNo}`, 140, 20);
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 140, 27);

    doc.line(14, 38, 196, 38);

    // 3. Billing Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT DETAILS:", 14, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Name: ${invoice.clientId.clientName.toUpperCase()}`, 14, 55);
    doc.text(`Phone: ${invoice.clientId.phone}`, 14, 61);
    doc.text(`Email: ${invoice.clientId.email || '-'}`, 14, 67);

    // 4. Items Table
    const tableData = invoice.items.map((item, index) => [
        index + 1,
        item.itemId.itemName,
        item.qty,
        item.priceAtSale.toLocaleString(),
        (item.qty * item.priceAtSale).toLocaleString()
    ]);

    autoTable(doc, {
        startY: 75,
        head: [['#', 'Item Description', 'Qty', 'Unit Price (RWF)', 'Total (RWF)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Blue theme for internal
        styles: { fontSize: 10 }
    });

    // 5. Totals Section
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`GRAND TOTAL:`, 130, finalY);
    doc.text(`${invoice.grandTotal.toLocaleString()} RWF`, 196, finalY, { align: 'right' });

    // 6. Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    const timestamp = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    doc.text(timestamp, 14, 285);
    doc.text("This is an internal document for project tracking purposes.", 14, 290);

    return doc.output('arraybuffer');
};

module.exports = { generateInternalPDF };
