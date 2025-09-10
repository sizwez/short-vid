require('dotenv').config();
const axios = require('axios');

const secret = process.env.PAYSTACK_SECRET || process.env.PAYSTACK_SECRET_KEY;
if (!secret) {
  console.error('MISSING_PAYSTACK_SECRET');
  process.exit(1);
}

async function main() {
  try {
    // Initialize a small test transaction (no card charged until authorization completed)
    const initBody = { email: 'test@example.com', amount: 100 }; // amount in kobo (100 kobo = 1 NGN)
    const init = await axios.post('https://api.paystack.co/transaction/initialize', initBody, {
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      validateStatus: () => true,
      timeout: 10000,
    });

    console.log('INIT_STATUS', init.status);
    if (init.data) {
      const summary = {
        status: init.data.status,
        message: init.data.message,
        reference: init.data.data ? init.data.data.reference : null,
        authorization: init.data.data && init.data.data.authorization ? { authorization_url: init.data.data.authorization.authorization_url } : null,
      };
      console.log('INIT_SUMMARY', summary);
    }

    if (init.data && init.data.data && init.data.data.reference) {
      const ref = init.data.data.reference;
      // Immediately verify the reference (likely not paid yet)
      const verify = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
        headers: { Authorization: `Bearer ${secret}` },
        validateStatus: () => true,
        timeout: 10000,
      });
      console.log('VERIFY_STATUS', verify.status);
      if (verify.data) {
        const vs = {
          status: verify.data.status,
          message: verify.data.message,
          reference: verify.data.data ? verify.data.data.reference : null,
          paid: verify.data.data ? !!verify.data.data.paid : null,
        };
        console.log('VERIFY_SUMMARY', vs);
      }
    }
  } catch (err) {
    if (err.response) {
      console.log('ERROR_STATUS', err.response.status);
      try { console.log('ERROR_BODY', JSON.stringify(err.response.data)); } catch(e){ console.log('ERROR_BODY', err.response.data); }
    } else {
      console.log('ERROR', err.message);
    }
  }
}

main();
