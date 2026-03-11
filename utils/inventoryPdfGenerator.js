const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

/**
 * Generates a PDF for the internal inventory list.
 * @param {Array} items - List of inventory items.
 * @param {String} category - The active filter category (optional).
 */
const generateInventoryPDF = (items, category = 'All') => {
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

    // 2. Report Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("INTERNAL INVENTORY REPORT", 14, 38);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Category Filter: ${category}`, 14, 45);
    doc.text(`Generated Date: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString()}`, 14, 50);

    doc.line(14, 55, 196, 55);

    // 3. Inventory Table
    const tableData = items.map((item, index) => {
        const qty = item.quantity || 0;
        const buy = item.buyingPrice || 0;
        const sell = item.defaultSellingPrice || 0;
        const profit = sell - buy;
        const totalProfit = profit * qty;

        return [
            index + 1,
            item.sku,
            item.itemName,
            item.description || '-',
            item.category,
            item.specification || '-',
            qty,
            buy.toLocaleString(),
            sell.toLocaleString(),
            totalProfit.toLocaleString()
        ];
    });

    autoTable(doc, {
        startY: 60,
        head: [['#', 'SKU', 'ITEM NAME', 'DESCRIPTION', 'CATEGORY', 'SPECIFICATION', 'QTY', 'BUYING', 'SELLING', 'PROFIT']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0] }, // Black header to match theme
        styles: { fontSize: 7 }, // Slightly smaller font to fit extra column
        columnStyles: {
            6: { halign: 'center' }, // Qty
            7: { halign: 'right' },  // Buying
            8: { halign: 'right' },  // Selling
            9: { halign: 'right' }   // Profit
        }
    });

    // 4. Summary Section
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalItems = items.length;
    const totalBuyingValue = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.buyingPrice || 0)), 0);
    const totalSellingValue = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.defaultSellingPrice || 0)), 0);
    const totalProfit = totalSellingValue - totalBuyingValue;

    doc.setFont("helvetica", "bold");
    doc.text(`Total Items: ${totalItems}`, 14, finalY);
    doc.text(`Total Buying Value: ${totalBuyingValue.toLocaleString()} RWF`, 14, finalY + 7);
    doc.text(`Total Selling Value: ${totalSellingValue.toLocaleString()} RWF`, 14, finalY + 14);
    doc.text(`Total Estimated Profit: ${totalProfit.toLocaleString()} RWF`, 14, finalY + 21);

    // 5. Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} | SmartBuild ERP`, 105, 285, { align: 'center' });
    }

    return doc.output('arraybuffer');
};

module.exports = { generateInventoryPDF };
