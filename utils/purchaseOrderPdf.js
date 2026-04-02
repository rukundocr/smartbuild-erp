const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

/**
 * Generates a PDF for a Purchase Order
 * @param {Object} po - The Purchase Order object (populated with supplier and items.item)
 * @returns {ArrayBuffer} - The generated PDF as an array buffer
 */
const generatePurchaseOrderPDF = async (po) => {
    const doc = new jsPDF();
    const now = new Date();

    // 1. Company Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SMARTBUILD LTD", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("PURCHASE ORDER", 14, 27);
    doc.text("Kigali, Rwanda | +250 785193526", 14, 32);

    // 2. PO Meta Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`PO NO: ${po._id.toString().substring(0, 8).toUpperCase()}`, 140, 20);
    doc.text(`DATE: ${new Date(po.orderDate).toLocaleDateString('en-GB')}`, 140, 27);
    doc.text(`EXPECTED: ${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-GB') : 'N/A'}`, 140, 34);

    doc.line(14, 40, 196, 40);

    // 3. Supplier Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SUPPLIER DETAILS:", 14, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Name: ${po.supplier.name.toUpperCase()}`, 14, 57);
    doc.text(`TIN: ${po.supplier.tin || '-'}`, 14, 63);
    doc.text(`Phone: ${po.supplier.phone}`, 14, 69);
    doc.text(`Email: ${po.supplier.email || '-'}`, 14, 75);

    // 4. Items Table
    let grandTotal = 0;
    const tableData = po.items.map((item, index) => {
        const lineTotal = item.quantityRequested * item.buyingPrice;
        grandTotal += lineTotal;
        return [
            index + 1,
            item.item.itemName + (item.item.specification ? ` - ${item.item.specification}` : ''),
            item.quantityRequested,
            item.buyingPrice.toLocaleString() + " RWF",
            lineTotal.toLocaleString() + " RWF"
        ];
    });

    autoTable(doc, {
        startY: 85,
        head: [['#', 'Item Description', 'Qty Requested', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] }, // Dark theme for PO
        styles: { fontSize: 10 }
    });

    // 5. Totals Section
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`GRAND TOTAL:`, 130, finalY);
    doc.text(`${grandTotal.toLocaleString()} RWF`, 196, finalY, { align: 'right' });

    // 6. Notes
    if (po.notes) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 14, finalY + 15);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(po.notes, 182);
        doc.text(splitNotes, 14, finalY + 22);
    }

    // 7. Signature Section
    const sigY = 240;
    doc.line(14, sigY, 70, sigY);
    doc.text("Prepared By", 14, sigY + 5);
    
    doc.line(130, sigY, 196, sigY);
    doc.text("Authorized Signature", 130, sigY + 5);

    // 8. Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    const timestamp = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    doc.text(timestamp, 14, 285);
    doc.text("This Purchase Order is subject to the terms and conditions of SmartBuild Ltd.", 14, 290);

    return doc.output('arraybuffer');
};

module.exports = { generatePurchaseOrderPDF };
