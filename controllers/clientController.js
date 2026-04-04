const { Client, validateClient } = require('../models/Client');
const { InternalInvoice } = require('../models/InternalInvoice'); // Added to check for dependencies
const { logAction } = require('../utils/logger');

exports.getClients = async (req, res) => {
    try {
        const clients = await Client.find().sort({ clientName: 1 });
        res.render('clients/index', {
            title: 'Internal Clients | SmartBuild',
            clients,
            currentTab: 'clients'
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching clients');
        res.redirect('/');
    }
};

exports.addClient = async (req, res) => {
    try {
        const { error } = validateClient(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect('/internal/clients');
        }

        const newClient = new Client(req.body);
        await newClient.save();

        await logAction(req.user._id, 'CREATE', 'INTERNAL_CLIENTS', newClient._id, `Added client: ${newClient.clientName}`);

        req.flash('success_msg', 'Client added successfully');
        res.redirect('/internal/clients');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding client');
        res.redirect('/internal/clients');
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { error } = validateClient(req.body);
        if (error) {
            req.flash('error_msg', error.details[0].message);
            return res.redirect('/internal/clients');
        }

        const client = await Client.findByIdAndUpdate(req.params.id, req.body);
        await logAction(req.user._id, 'UPDATE', 'INTERNAL_CLIENTS', req.params.id, `Updated client: ${client.clientName}`);

        req.flash('success_msg', 'Client updated');
        res.redirect('/internal/clients');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating client');
        res.redirect('/internal/clients');
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const clientId = req.params.id;
        const client = await Client.findById(clientId);

        if (!client) {
            req.flash('error_msg', 'Client not found.');
            return res.redirect('/internal/clients');
        }

        // 1. Check for associated invoices before deletion
        const invoiceCount = await InternalInvoice.countDocuments({ clientId: clientId });
        if (invoiceCount > 0) {
            req.flash('error_msg', `Cannot delete "${client.clientName}": There are ${invoiceCount} invoice(s) associated with this client. Delete the invoices first.`);
            return res.redirect('/internal/clients');
        }

        await logAction(req.user._id, 'DELETE', 'INTERNAL_CLIENTS', clientId, `Deleted client: ${client.clientName}`);
        await Client.findByIdAndDelete(clientId);
        req.flash('success_msg', `Client "${client.clientName}" removed successfully from the system.`);
        res.redirect('/internal/clients');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting client');
        res.redirect('/internal/clients');
    }
};
