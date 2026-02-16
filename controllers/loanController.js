const Loan = require('../models/Loan');
const { logAction } = require('../utils/logger');
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable"); // Changed this

exports.getLoans = async (req, res) => {
    try {
        const loans = await Loan.find().sort({ dateBorrowed: -1 }).lean();

        // Sort payments by date desc for history view
        loans.forEach(loan => {
            if (loan.payments && loan.payments.length > 0) {
                loan.payments.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
        });

        const totals = loans.reduce((acc, l) => {
            acc.totalBorrowed += (l.totalAmount || 0);
            acc.totalPaid += (l.amountPaid || 0);
            acc.remaining += ((l.totalAmount || 0) - (l.amountPaid || 0));
            return acc;
        }, { totalBorrowed: 0, totalPaid: 0, remaining: 0 });

        res.render('loans/list', { loans, totals });
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: 'Error occured while fetching  lonas  . Something went wrong on our end.'
        });
    }
};

exports.getLoanHistory = async (req, res) => {
    try {
        const loan = await Loan.findById(req.params.id).lean();
        if (!loan) {
            return res.status(404).render('404', { title: 'Loan Not Found' });
        }

        // Sort payments by date desc
        if (loan.payments && loan.payments.length > 0) {
            loan.payments.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        res.render('loans/history', { loan });
    } catch (err) {
        console.error(err);
        res.status(500).render("500", {
            layout: false,
            message: 'Error fetching loan history.'
        });
    }
};

exports.createLoan = async (req, res) => {
    try {
        const { lenderName, totalAmount, description, dateBorrowed } = req.body;
        const loan = await Loan.create({
            lenderName,
            totalAmount: parseFloat(totalAmount),
            description,
            dateBorrowed
        });
        await logAction(req.user._id, 'CREATE', 'LOANS', loan._id, `Registered loan from ${lenderName}`);
        res.redirect('/loans');
    } catch (err) {
        console.error(err);
        res.status(500).render("500", {
            layout: false,
            message: 'Error occured while Creating laon. Something went wrong on our end.'
        });
    }
};

exports.addPayment = async (req, res) => {
    try {
        const { amount, note } = req.body;
        const loan = await Loan.findById(req.params.id);
        const paymentAmount = parseFloat(amount);

        loan.amountPaid += paymentAmount;
        if (loan.amountPaid >= loan.totalAmount) loan.status = 'Cleared';

        loan.payments.push({ amount: paymentAmount, note, date: new Date() });
        await loan.save();

        await logAction(req.user._id, 'UPDATE', 'LOANS', loan._id, `Paid ${paymentAmount} RWF to ${loan.lenderName}`);
        res.redirect('/loans');
    } catch (err) {

        res.status(500).render("500", {
            layout: false,
            message: 'Error occured while Processing payment  . Something went wrong on our end.'
        });
    }
};

exports.deleteLoan = async (req, res) => {
    try {
        await Loan.findByIdAndDelete(req.params.id);
        res.redirect('/loans');
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: 'Error Deleting loan . Something went wrong on our end.'
        });
    }
};

exports.updateLoan = async (req, res) => {
    try {
        const { lenderName, totalAmount, description, dateBorrowed, status } = req.body;
        const loan = await Loan.findByIdAndUpdate(req.params.id, {
            lenderName,
            totalAmount: parseFloat(totalAmount),
            description,
            dateBorrowed,
            status
        }, { new: true });

        await logAction(req.user._id, 'UPDATE', 'LOANS', loan._id, `Updated details for loan from ${lenderName}`);
        res.redirect('/loans');
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).render("500", {
            layout: false,
            message: 'Loan Updating Error . Something went wrong on our end.'
        });
    }
};

// PDF EXPORT WITH SUMMARY
exports.exportLoansPDF = async (req, res) => {
    try {
        const loans = await Loan.find().sort({ dateBorrowed: -1 }).lean();
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("SMARTBUILD - Loan Management Report", 14, 20);

        // Data prep
        let grandTotal = 0, totalPaid = 0;
        const tableRows = loans.map(loan => {
            const balance = (loan.totalAmount - loan.amountPaid);
            grandTotal += loan.totalAmount;
            totalPaid += loan.amountPaid;
            return [
                loan.lenderName,
                loan.description || '-',
                loan.totalAmount.toLocaleString(),
                loan.amountPaid.toLocaleString(),
                balance.toLocaleString(),
                loan.status
            ];
        });

        // Main Table
        autoTable.default(doc, {
            head: [["Lender", "Description", "Total", "Paid", "Balance", "Status"]],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // SUMMARY TABLE AT BOTTOM
        const finalY = doc.lastAutoTable.finalY + 10;
        autoTable.default(doc, {
            body: [
                ["GRAND TOTAL BORROWED", `${grandTotal.toLocaleString()} RWF`],
                ["TOTAL AMOUNT PAID", `${totalPaid.toLocaleString()} RWF`],
                ["TOTAL OUTSTANDING", `${(grandTotal - totalPaid).toLocaleString()} RWF`]
            ],
            startY: finalY,
            styles: { fontStyle: 'bold', halign: 'right' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40 } },
            theme: 'plain'
        });

        const pdfOutput = doc.output("arraybuffer");
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Loan_Summary.pdf`);
        res.send(Buffer.from(pdfOutput));
    } catch (err) {
        res.status(500).render("500", {
            layout: false,
            message: 'PDF EXPORT WITH SUMMARY Error . Something went wrong on our end.'
        });
    }
};