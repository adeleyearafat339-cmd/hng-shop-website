require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws'); // Fixed: changed 'import' to 'require'

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client with options to bypass Node 20 WebSocket issues
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { 
        transport: ws 
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint to fetch products from Supabase database
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running smoothly on http://localhost:${PORT}`);
});