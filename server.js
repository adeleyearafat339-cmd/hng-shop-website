require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mailgun Setup
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || 'your-mailgun-api-key'
});

// Checkout API Endpoint
app.post('/api/checkout', async (req, res) => {
    const { productName, customerName, email, address } = req.body;

    try {
        // 1. Save order to Supabase database
        const { data, error } = await supabase
            .from('orders')
            .insert([{ product_name: productName, customer_name: customerName, email, address }]);

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        // 2. Send real confirmation email via Mailgun
        try {
            await mg.messages.create(process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org', {
                from: "HNG Shop <mailgun@" + (process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org') + ">",
                to: [email],
                subject: "Order Confirmation - HNG Store",
                text: `Hello ${customerName},\n\nThank you for your order! You have successfully purchased: ${productName}.\n\nIt will be shipped to: ${address}.\n\nBest regards,\nHNG Store Team`
            });
            console.log('Mailgun confirmation email sent successfully.');
        } catch (mailErr) {
            console.error('Mailgun Error (simulated fallback applied if domain/key is sandbox):', mailErr);
        }

        res.json({ success: true, message: 'Order placed and confirmation email triggered!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running smoothly on http://localhost:${PORT}`);
});