const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

function getBillingAnchor() {
  const now = new Date();
  const firstOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
    0, 0, 0
  );
  return Math.floor(firstOfNextMonth.getTime() / 1000);
}

app.get('/checkout-standard', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_STANDARD,
          quantity: 1,
        },
      ],
      payment_method_types: ['card', 'sepa_debit'],
      subscription_data: {
        billing_cycle_anchor: getBillingAnchor(),
        proration_behavior: 'create_prorations',
      },
      success_url: 'https://webfire-marketing.com',
      cancel_url: 'https://webfire-marketing.com/?checkout_cancelled=1',
    });

    res.redirect(session.url);
  } catch (err) {
    console.error('Standard checkout error:', err.message);
    res.status(500).send('Fehler beim Standard Checkout');
  }
});

app.get('/checkout-basic', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_BASIC,
          quantity: 1,
        },
      ],
      payment_method_types: ['card', 'sepa_debit'],
      subscription_data: {
        billing_cycle_anchor: getBillingAnchor(),
        proration_behavior: 'create_prorations',
      },
      success_url: 'https://webfire-marketing.com',
      cancel_url: 'https://webfire-marketing.com',
    });

    res.redirect(session.url);
  } catch (err) {
    console.error('Basic checkout error:', err.message);
    res.status(500).send('Fehler beim Basic Checkout');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
