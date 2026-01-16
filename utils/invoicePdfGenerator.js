const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateInvoicePDF = (invoice) => {
    const doc = new jsPDF();

    // 1. Company Header (Customized as requested)
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("SMARTBUILD LTD", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Kigali, Rwanda | Phone: +250 785193526 | TIN: 120333710", 14, 27);

    // 2. Invoice Meta Info (Right Side)
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`INVOICE NO: ${invoice.invoiceNumber}`, 140, 20);
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 140, 27);

    // 3. Bill To Section
    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35); // Horizontal Line
    
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 14, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(invoice.clientName.toUpperCase(), 14, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Site Location: ${invoice.siteLocation}`, 14, 58);

    // 4. Items Table with Numbering
    const tableData = invoice.items.map((item, index) => [
        index + 1, // Automatic Numbering: 1, 2, 3...
        item.itemName,
        item.specs || '-',
        item.unit || '-',
        item.qty,
        item.unitPrice.toLocaleString() + " RWF",
        item.totalPrice.toLocaleString() + " RWF"
    ]);

    autoTable(doc, {
        startY: 65,
        head: [['#', 'Item Description', 'Specifications', 'Unit', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // The '#' column
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' }
        },
        styles: { fontSize: 9 }
    });
// 5. Totals Section (Right Aligned)
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal:`, 130, finalY);
    doc.text(`${invoice.subtotal.toLocaleString()} RWF`, 196, finalY, { align: 'right' });
    
    doc.text(`VAT (18%):`, 130, finalY + 7);
    doc.text(`${invoice.vatAmount.toLocaleString()} RWF`, 196, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(0);
    doc.line(130, finalY + 10, 196, finalY + 10); // Small line above Grand Total

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Grand Total:`, 130, finalY + 16);
    doc.text(`${invoice.grandTotal.toLocaleString()} RWF`, 196, finalY + 16, { align: 'right' });

    // 6. Signature Block (Left Aligned, same Y level as Totals)
    // We use finalY to ensure it sits to the left of the money section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", 14, finalY);
    
    doc.setFontSize(11);
    doc.text("Kabeho Theoneste", 14, finalY + 7);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Managing Director", 14, finalY + 12);
    
    doc.setDrawColor(150);
    doc.line(14, finalY + 25, 70, finalY + 25); // Signature Line
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("(Signature & Stamp)", 14, finalY + 30);

    return doc.output('arraybuffer');
};

module.exports = { generateInvoicePDF };