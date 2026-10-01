require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

// Safely initialize Mailgun only if API key exists
let mg = null;
if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/checkout', async (req, res) => {
    try {
        const { productName, customerName, email, address } = req.body;

        // 1. Save order to Supabase
        const { error: dbError } = await supabase
            .from('orders')
            .insert([{ product_name: productName, customer_name: customerName, email, address }]);

        if (dbError) throw dbError;

        // 2. Send confirmation email via Mailgun if configured
        if (mg && process.env.MAILGUN_DOMAIN) {
            try {
                await mg.messages.create(process.env.MAILGUN_DOMAIN, {
                    from: `HNG Shop <mailgun@${process.env.MAILGUN_DOMAIN}>`,
                    to: [email],
                    subject: 'Order Confirmation - HNG Shop',
                    text: `Hello ${customerName},\n\nThank you for your order! You have successfully purchased a ${productName}.\n\nShipping Address: ${address}\n\nWe will process your order shortly.\n\nBest regards,\nHNG Shop Team`
                });
                console.log(`Confirmation email sent to ${email}`);
            } catch (mailErr) {
                console.error('Mailgun error:', mailErr);
            }
        } else {
            console.log(`Order saved successfully for ${customerName} (Email skipped - no Mailgun API key).`);
        }

        res.status(200).json({ success: true, message: 'Order placed and saved successfully!' });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: 'Failed to process checkout' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running smoothly on http://localhost:${PORT}`);
});