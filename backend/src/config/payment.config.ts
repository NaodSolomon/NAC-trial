import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  paypal: {
    enabled: process.env.PAYPAL_ENABLED === 'true',
    baseUrl: process.env.PAYPAL_BASE_URL ?? 'https://api-m.sandbox.paypal.com',
    clientId: process.env.PAYPAL_CLIENT_ID ?? '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? '',
    returnUrl: process.env.PAYPAL_RETURN_URL ?? 'http://localhost:3000/donate/success',
    cancelUrl: process.env.PAYPAL_CANCEL_URL ?? 'http://localhost:3000/donate/cancel',
  },
}));
