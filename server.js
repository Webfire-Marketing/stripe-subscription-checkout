const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

/**
 * Wichtig:
 * Der Webhook muss VOR express.json() stehen,
 * weil Stripe den RAW body für die Signaturprüfung braucht.
 */
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe Event erhalten:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout abgeschlossen:', session.id);
        console.log('Kunde:', session.customer);
        console.log('Subscription:', session.subscription);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('Subscription erstellt:', subscription.id);
        console.log('Customer:', subscription.customer);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Rechnung bezahlt:', invoice.id);
        console.log('Customer:', invoice.customer);
        console.log('Subscription:', invoice.subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Zahlung fehlgeschlagen:', invoice.id);
        console.log('Customer:', invoice.customer);
        console.log('Subscription:', invoice.subscription);
        break;
      }

      default:
        console.log(`Unbehandeltes Event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Fehler bei der Webhook-Verarbeitung:', err.message);
    return res.status(500).send('Webhook processing error');
  }
});

/**
 * Ab hier normale JSON/URL Middleware.
 * Nicht vor den Webhook setzen.
 */
app.use(express.json());

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

app.get('/', (req, res) => {
  res.send('Webfire Stripe Checkout Server läuft.');
});

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

      automatic_tax: {
        enabled: true,
      },

      billing_address_collection: 'required',

      tax_id_collection: {
        enabled: true,
        required: 'if_supported',
      },

      subscription_data: {
        billing_cycle_anchor: getBillingAnchor(),
        proration_behavior: 'create_prorations',
      },

      success_url: 'https://webfire-marketing.com/?checkout_success=standard',
      cancel_url: 'https://webfire-marketing.com/?checkout_cancelled=standard',
    });

    return res.redirect(session.url);
  } catch (err) {
    console.error('Standard checkout error:', err.message);
    return res.status(500).send('Fehler beim Standard Checkout');
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

      automatic_tax: {
        enabled: true,
      },

      billing_address_collection: 'required',

      tax_id_collection: {
        enabled: true,
        required: 'if_supported',
      },

      subscription_data: {
        billing_cycle_anchor: getBillingAnchor(),
        proration_behavior: 'create_prorations',
      },

      success_url: 'https://webfire-marketing.com/?checkout_success=basic',
      cancel_url: 'https://webfire-marketing.com/?checkout_cancelled=basic',
    });

    return res.redirect(session.url);
  } catch (err) {
    console.error('Basic checkout error:', err.message);
    return res.status(500).send('Fehler beim Basic Checkout');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
