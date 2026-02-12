const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const QRCode = require('qrcode'); // Import QRCode

const generateInvoicePDF = async (invoice) => { // Changed to async
    const doc = new jsPDF();
    const now = new Date();

    // 1. Company Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
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

    doc.line(14, 35, 196, 35); 
    
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 14, 45);
    doc.setFontSize(12);
    doc.text(invoice.clientName.toUpperCase(), 14, 52);

    let currentY = 58;
    if (invoice.projectId && invoice.projectId.projectName) {
        doc.setFont("helvetica", "bold");
        doc.text(`Project: ${invoice.projectId.projectName}`, 14, currentY);
        currentY += 6;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Site Location: ${invoice.siteLocation}`, 14, currentY);

    // 4. Items Table
    const tableData = invoice.items.map((item, index) => [
        index + 1,
        item.itemName,
        item.specs || '-',
        item.unit || '-',
        item.qty,
        item.unitPrice.toLocaleString() ,
        item.totalPrice.toLocaleString(),
    ]);

    autoTable(doc, {
        startY: currentY + 7,
        head: [['#', 'Item Description', 'Specifications', 'Unit', 'Qty', 'Unit Price (RWF)', 'Total Price(RWF)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] },
        styles: { fontSize: 9 }
    });

    // 5. Totals Section
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.text(`Subtotal:`, 130, finalY);
    doc.text(`${invoice.subtotal.toLocaleString()} RWF`, 196, finalY, { align: 'right' });
    doc.text(`VAT (18%):`, 130, finalY + 7);
    doc.text(`${invoice.vatAmount.toLocaleString()} RWF`, 196, finalY + 7, { align: 'right' });
    doc.line(130, finalY + 10, 196, finalY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total:`, 130, finalY + 16);
    doc.text(`${invoice.grandTotal.toLocaleString()} RWF`, 196, finalY + 16, { align: 'right' });

    // 6. Signature Block
    doc.text("Approved by:", 14, finalY);
    doc.text("Kabeho Theoneste", 14, finalY + 7);
    doc.setFont("helvetica", "italic");
    doc.text("Managing Director", 14, finalY + 12);
    doc.line(14, finalY + 25, 70, finalY + 25); 

    // --- NEW: QR CODE & FOOTER DETAILS ---
    
    // Create the Verification URL (Replace with your actual domain later)
    const verifyUrl = `https://smartbuildms.onrender.com/invoices/verify/invoice/${invoice._id}`;
    
    try {
        const qrDataUrl = await QRCode.toDataURL(verifyUrl);
        // Add QR code image (x, y, width, height)
        doc.addImage(qrDataUrl, 'PNG', 165, finalY + 25, 30, 30);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text("Scan to verify authenticity", 165, finalY + 58);
    } catch (err) {
        console.error("QR Generation Error:", err);
    }

    // 7. Footer Timestamp
    const timestamp = `Generated on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    doc.setFontSize(7);
    doc.text(timestamp, 14, 285);
    doc.text("This is a computer-generated document.", 14, 289);

    return doc.output('arraybuffer');
};

module.exports = { generateInvoicePDF };