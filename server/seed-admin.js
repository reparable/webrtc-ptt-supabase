// server/seed-admin.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. See .env.example');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPA_URL, SERVICE_ROLE_KEY);

async function seedAdmin() {
  const email = 'admin@example.com';
  const password = 'admin';
  const username = 'admin';
  const full_name = 'admin';

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name }
  });

  if (error) {
    console.error('Error creating admin user:', error);
    return;
  }

  const userId = data.id;
  console.log('Admin user created with id', userId);

  const { error: pErr } = await supabaseAdmin.from('profiles').insert([
    { id: userId, username, full_name }
  ]);

  if (pErr) console.error('Error inserting profile:', pErr);
  else console.log('Admin profile inserted.');
}

seedAdmin().catch(console.error);
