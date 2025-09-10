require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');

// Env vars to set before running (PowerShell example):
// $env:SUPABASE_URL = 'https://xyz.supabase.co'; $env:SUPABASE_KEY = 'anon...';
// $env:PAYSTACK_SECRET = 'sk_test_...'; $env:OPENAI_KEY = 'sk-...'; $env:JWT_SECRET = 'secret'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PROJECT_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
const OPENAI_KEY = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

async function testSupabase() {
  console.log('\n🟦 Testing Supabase...');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase: SKIPPED — missing SUPABASE_URL or SUPABASE_KEY environment variables.');
    return;
  }

  try {
    const url = new URL('/rest/v1', SUPABASE_URL).toString();
    const res = await axios.get(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      validateStatus: () => true,
      timeout: 5000,
    });
    console.log(`Supabase: HTTP ${res.status} — ${res.statusText}`);
  } catch (err) {
    console.log('Supabase: ERROR —', err.message || err.toString());
  }
}

async function testPaystack() {
  console.log('\n🟨 Testing Paystack...');
  if (!PAYSTACK_SECRET) {
    console.log('Paystack: SKIPPED — missing PAYSTACK_SECRET env var.');
    return;
  }

  try {
    const res = await axios.get('https://api.paystack.co/transaction/verify/0', {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      validateStatus: () => true,
      timeout: 5000,
    });
    console.log(`Paystack: HTTP ${res.status} — ${res.statusText}`);
  } catch (err) {
    console.log('Paystack: ERROR —', err.message || err.toString());
  }
}

async function testOpenAI() {
  console.log('\n🟪 Testing OpenAI...');
  if (!OPENAI_KEY) {
    console.log('OpenAI: SKIPPED — missing OPENAI_KEY env var.');
    return;
  }

  try {
    const client = new OpenAI({ apiKey: OPENAI_KEY });
    const res = await client.models.list();
    console.log('OpenAI: OK — models retrieved:', Array.isArray(res.data) ? res.data.length : 'unknown');
  } catch (err) {
    console.log('OpenAI: ERROR —', err.message || err.toString());
  }
}

async function testJWT() {
  console.log('\n🔐 Testing JWT...');
  if (!JWT_SECRET) {
    console.log('JWT: SKIPPED — missing JWT_SECRET env var.');
    return;
  }

  try {
    const payload = { env: process.env.NODE_ENV || 'dev', ts: Date.now() };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('JWT: OK — signed and verified. Keys:', Object.keys(decoded));
  } catch (err) {
    console.log('JWT: ERROR —', err.message || err.toString());
  }
}

(async function main() {
  console.log('Starting connectivity tests.');
  await testSupabase();
  await testPaystack();
  await testOpenAI();
  await testJWT();
  console.log('\nAll tests complete.');
})();
