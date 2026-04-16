import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { initializeFirebase } from './firebase-init.js';

dotenv.config();

// ─── Firebase Admin Initialization ───────────────────────────────────────────
initializeFirebase();

const app = express();

// Rate limiting store (in-memory; use Redis for production scale)
const rateLimitStore = new Map();
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    rateLimitStore.set(key, record);

    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
  };
};

// Stricter rate limit for auth and payment endpoints
const authRateLimit = rateLimit(10, 15 * 60 * 1000); // 10 requests per 15 min
const paymentRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 requests per 15 min

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const supabaseHeaders = {
  'apikey': SUPABASE_SERVICE_ROLE,
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.get(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data && response.data.id) {
      req.user = response.data;
      next();
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Firebase Auth Bridge is no longer needed (Migrated to Cloudinary)

// ─── Initialize Payment with Paystack ─────────────────────────────────────────
app.post('/api/paystack/initialize', authenticateUser, paymentRateLimit, async (req, res) => {
  try {
    const { amount } = req.body;
    const email = req.user.email;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const amountInKobo = Math.round(Number(amount));
    if (amountInKobo < 1000) {
      return res.status(400).json({ error: 'Minimum payment amount is R10' });
    }

    const idempotencyKey = `${userId}_${amountInKobo}_${Date.now()}`;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInKobo,
        callback_url: `${CLIENT_URL}/app/payment/success`,
        metadata: { userId, type: 'topup', idempotencyKey }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// ─── Verify Paystack Payment ──────────────────────────────────────────────────
app.post('/api/paystack/verify', authenticateUser, async (req, res) => {
  try {
    const { reference } = req.body;
    const userId = req.user.id;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const { data } = response.data;

    if (data.status === 'success') {
      const amountInZar = data.amount / 100;

      if (data.metadata?.userId && data.metadata.userId !== userId) {
        return res.status(403).json({ error: 'Payment does not belong to this user' });
      }

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
        try {
          const { data: userData } = await axios.get(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
            { headers: supabaseHeaders }
          );

          if (userData && userData.length > 0) {
            const currentEarnings = userData[0].earnings || 0;
            await axios.patch(
              `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
              { earnings: currentEarnings + amountInZar },
              { headers: supabaseHeaders }
            );
          }
        } catch (dbError) {
          console.error('Failed to update user earnings:', dbError);
        }
      }

      res.json({ success: true, amount: amountInZar });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ─── Paystack Webhook ─────────────────────────────────────────────────────────
app.post('/api/paystack/webhook', async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const signature = req.headers['x-paystack-signature'];
    if (!signature || hash !== signature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const { amount, metadata } = event.data;
      const amountInZar = amount / 100;
      const userId = metadata?.userId;

      if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
        try {
          const { data: userData } = await axios.get(
            `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
            { headers: supabaseHeaders }
          );

          if (userData && userData.length > 0) {
            const currentEarnings = userData[0].earnings || 0;
            await axios.patch(
              `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
              { earnings: currentEarnings + amountInZar },
              { headers: supabaseHeaders }
            );
            await axios.post(
              `${SUPABASE_URL}/rest/v1/notifications`,
              { user_id: userId, actor_id: userId, type: 'earnings', amount: amountInZar, read: false },
              { headers: supabaseHeaders }
            );
          }
        } catch (dbError) {
          console.error('Failed to process webhook:', dbError);
        }
      }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
app.post('/api/notifications/call', authenticateUser, async (req, res) => {
  try {
    const { recipientId, callerName, callType = 'video' } = req.body;
    const senderId = req.user.id;

    if (!recipientId) return res.status(400).json({ error: 'Recipient ID is required' });

    // 1. Get recipient token
    const { data: devices, error: deviceError } = await axios.get(
      `${SUPABASE_URL}/rest/v1/user_devices?user_id=eq.${recipientId}&is_active=eq.true`,
      { headers: supabaseHeaders }
    );

    if (deviceError || !devices || devices.length === 0) {
      return res.status(404).json({ error: 'Recipient is not registered for notifications' });
    }

    const token = devices[0].fcm_token;

    // 2. Dispatch Notification
    if (admin.apps.length > 0) {
      const message = {
        notification: {
          title: `Incoming ${callType} call`,
          body: `${callerName} is calling you...`
        },
        data: {
          type: 'incoming_call',
          callerId: senderId,
          callerName,
          callType
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default'
            }
          }
        },
        token: token
      };

      await admin.messaging().send(message);
      console.log(`[Push Notification] Sent to user ${recipientId}`);
    } else {
      console.log(`[SIMULATION] Sending ${callType} call from ${callerName} to ${recipientId} (${token})`);
    }

    res.json({ success: true, message: 'Notification queued' });
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ─── Export for Vercel ────────────────────────────────────────────────────────
export default app;
