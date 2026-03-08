const { Client, validateClient } = require('../models/Client');
const { logAction } = require('../utils/logger');

exports.getClients = async (req, res) => {
    try {
        const clients = await Client.find().sort({ clientName: 1 });
        res.render('clients/index', {
            title: 'Internal Clients | SmartBuild',
            clients
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
        const client = await Client.findById(req.params.id);
        if (client) {
            await logAction(req.user._id, 'DELETE', 'INTERNAL_CLIENTS', req.params.id, `Deleted client: ${client.clientName}`);
            await Client.findByIdAndDelete(req.params.id);
        }
        req.flash('success_msg', 'Client removed');
        res.redirect('/internal/clients');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting client');
        res.redirect('/internal/clients');
    }
};
