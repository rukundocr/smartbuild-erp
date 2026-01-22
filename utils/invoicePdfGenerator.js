const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

const generateInvoicePDF = (invoice) => {
    const doc = new jsPDF();

    // 1. Company Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("SMARTBUILD LTD", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Kigali, Rwanda | Phone: +250 785193526 | TIN: 120333710", 14, 27);

    // 2. Invoice Meta Info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`INVOICE NO: ${invoice.invoiceNumber}`, 140, 20);
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 140, 27);

    // 3. Bill To Section (Updated with Project Name)
    doc.setDrawColor(200);
    doc.line(14, 35, 196, 35); 
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BILL TO:", 14, 45);
    
    doc.setFontSize(12);
    doc.text(invoice.clientName.toUpperCase(), 14, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    let currentY = 58;

    // NEW: Check if project exists and display it
    if (invoice.projectId && invoice.projectId.projectName) {
        doc.setFont("helvetica", "bold");
        doc.text(`Project: ${invoice.projectId.projectName}`, 14, currentY);
        doc.setFont("helvetica", "normal");
        currentY += 6; // Move next line down
    }

    doc.text(`Site Location: ${invoice.siteLocation}`, 14, currentY);

    // 4. Items Table
    const tableData = invoice.items.map((item, index) => [
        index + 1,
        item.itemName,
        item.specs || '-',
        item.unit || '-',
        item.qty,
        item.unitPrice.toLocaleString() + " RWF",
        item.totalPrice.toLocaleString() + " RWF"
    ]);

    autoTable(doc, {
        startY: currentY + 7, // Adjust table start based on whether project info was added
        head: [['#', 'Item Description', 'Specifications', 'Unit', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' }
        },
        styles: { fontSize: 9 }
    });

    // 5. Totals Section
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal:`, 130, finalY);
    doc.text(`${invoice.subtotal.toLocaleString()} RWF`, 196, finalY, { align: 'right' });
    
    doc.text(`VAT (18%):`, 130, finalY + 7);
    doc.text(`${invoice.vatAmount.toLocaleString()} RWF`, 196, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(0);
    doc.line(130, finalY + 10, 196, finalY + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Grand Total:`, 130, finalY + 16);
    doc.text(`${invoice.grandTotal.toLocaleString()} RWF`, 196, finalY + 16, { align: 'right' });

    // 6. Signature Block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Approved by:", 14, finalY);
    doc.text("Kabeho Theoneste", 14, finalY + 7);
    doc.setFont("helvetica", "italic");
    doc.text("Managing Director", 14, finalY + 12);
    doc.setDrawColor(150);
    doc.line(14, finalY + 25, 70, finalY + 25); 
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("(Signature & Stamp)", 14, finalY + 30);

    return doc.output('arraybuffer');
};

module.exports = { generateInvoicePDF };