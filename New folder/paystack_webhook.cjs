require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || process.env.PAYSTACK_SECRET_KEY;

// Paystack sends raw body; we need raw buffer to verify signature
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.post('/paystack/webhook', (req, res) => {
  if (!PAYSTACK_SECRET) {
    console.error('Missing PAYSTACK_SECRET');
    return res.status(500).send('Server misconfigured');
  }

  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    console.warn('Missing signature header');
    return res.status(400).send('Missing signature');
  }

  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.rawBody).digest('hex');
  if (hash !== signature) {
    console.warn('Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // Signature valid — handle the event
  const event = req.body;
  console.log('Paystack webhook event:', event.event);

  // Implement your own handling here: update order status, verify transaction, etc.

  // Return HTTP 200 quickly to acknowledge
  res.status(200).send('OK');
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Paystack webhook listener running on port ${PORT}`));
}

module.exports = app;
