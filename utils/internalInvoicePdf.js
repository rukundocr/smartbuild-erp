const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateInternalPDF = async (invoice, format = 'a4') => {
    if (format === 'thermal') {
        return generateThermalPDF(invoice);
    }

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
        item.itemId.specification ? `${item.itemId.itemName} - ${item.itemId.specification}` : item.itemId.itemName,
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

const generateThermalPDF = (invoice) => {
    const pageWidth = 80;
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);

    // Calculate height roughly based on items
    let pageHeight = 100 + (invoice.items.length * 15);

    const doc = new jsPDF({
        unit: 'mm',
        format: [pageWidth, pageHeight]
    });

    let y = 10;

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTBUILD LTD", pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Internal Inventory Supply", pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text("+250 785193526", pageWidth / 2, y, { align: 'center' });

    y += 4;
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);

    // Invoice Info
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE NO:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoiceNo, margin + 25, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("DATE:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(invoice.date).toLocaleDateString('en-GB'), margin + 15, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("STATUS:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.status, margin + 18, y);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT:", margin, y);
    doc.setFont("helvetica", "normal");
    const clName = invoice.clientId.clientName.toUpperCase();
    doc.text(clName.length > 20 ? clName.slice(0, 20) : clName, margin + 18, y);

    y += 5;
    doc.line(margin, y, pageWidth - margin, y);

    // Table Header
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Item Details", margin, y);
    doc.text("Total", pageWidth - margin, y, { align: 'right' });

    y += 2;
    doc.line(margin, y, pageWidth - margin, y);

    // Table Body
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    invoice.items.forEach((item) => {
        const itemName = item.itemId.specification
            ? `${item.itemId.itemName} - ${item.itemId.specification}`
            : item.itemId.itemName;

        // Wrap text to use full width
        const splitTitle = doc.splitTextToSize(itemName, pageWidth - (margin * 2));
        doc.text(splitTitle, margin, y);
        y += (splitTitle.length * 4);

        // Quantity x Unit Price = Total
        doc.text(`${item.qty} x ${item.priceAtSale.toLocaleString()} RWF`, margin + 5, y);
        doc.text((item.qty * item.priceAtSale).toLocaleString(), pageWidth - margin, y, { align: 'right' });

        y += 6;
    });

    y += 1;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    // Total
    y += 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL:", margin, y);
    doc.text((invoice.grandTotal).toLocaleString() + " RWF", pageWidth - margin, y, { align: 'right' });

    // Footer
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your business!", pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text("*** Internal Document ***", pageWidth / 2, y, { align: 'center' });

    return doc.output('arraybuffer');
};

module.exports = { generateInternalPDF };
