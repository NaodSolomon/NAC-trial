import { registerAs } from '@nestjs/config';

export default registerAs('runtime', () => ({
  trialMode: process.env.PAYMENT_DRIVER === 'fake' || process.env.NODE_ENV !== 'production',
  storageDriver: process.env.STORAGE_DRIVER ?? 'minio',
  mailDriver: process.env.MAIL_DRIVER ?? 'mailpit',
  paymentDriver: process.env.PAYMENT_DRIVER ?? 'fake',
  cacheDriver: process.env.CACHE_DRIVER ?? 'redis',
  paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
}));
