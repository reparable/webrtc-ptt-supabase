// server/server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPA_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!SUPA_URL || !SERVICE_ROLE_KEY || !ADMIN_TOKEN) {
  console.error('Missing env vars. See .env.example');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPA_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health
app.get('/', (req, res) => res.send('webrtc-ptt-supabase server running'));

// Admin delete user endpoint
app.post('/admin/delete', async (req, res) => {
  const token = req.headers['x-admin-token'] || req.body.admin_token;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: 'forbidden' });

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Optional: endpoint to request ephemeral TURN credentials (if Coturn configured for REST API)
app.post('/turn/credentials', (req, res) => {
  // Example: return static TURN credentials from env (not secure for production)
  const user = process.env.TURN_USER;
  const pass = process.env.TURN_PASS;
  const url = process.env.TURN_URL;
  if (!user || !pass || !url) return res.status(500).json({ error: 'turn not configured' });
  res.json({ username: user, credential: pass, urls: [url] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
