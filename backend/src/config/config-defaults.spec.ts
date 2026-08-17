import appConfig from './app.config';
import mailConfig from './mail.config';
import paymentConfig from './payment.config';
import storageConfig from './storage.config';

const trackedKeys = [
  'API_HOST',
  'API_PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'INTERNAL_API_KEY',
  'SCHEDULED_PUBLISHING_ENABLED',
  'SCHEDULED_PUBLISHING_INTERVAL_MS',
  'RESOURCE_DOWNLOAD_LOG_CLEANUP_ENABLED',
  'RESOURCE_DOWNLOAD_LOG_RETENTION_DAYS',
  'RESOURCE_DOWNLOAD_LOG_CLEANUP_INTERVAL_MS',
  'SWAGGER_ENABLED',
  'RATE_LIMIT_TTL_MS',
  'RATE_LIMIT_REQUESTS',
  'HTTP_LOG_SUCCESS_SAMPLE_RATE',
  'HTTP_SLOW_REQUEST_MS',
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_FROM',
  'CONTACT_NOTIFICATION_EMAIL',
  'MAIL_CONNECTION_TIMEOUT_MS',
  'MAIL_GREETING_TIMEOUT_MS',
  'MAIL_SOCKET_TIMEOUT_MS',
  'PASSWORD_RESET_TTL_MINUTES',
  'PASSWORD_RESET_URL',
  'OUTBOX_WORKER_ENABLED',
  'OUTBOX_WORKER_INTERVAL_MS',
  'OUTBOX_WORKER_BATCH_SIZE',
  'OUTBOX_WORKER_MAX_ATTEMPTS',
  'OUTBOX_WORKER_BACKOFF_MS',
  'OUTBOX_WORKER_LOCK_TIMEOUT_MS',
  'STORAGE_ENDPOINT',
  'STORAGE_REGION',
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY_ID',
  'STORAGE_SECRET_ACCESS_KEY',
  'STORAGE_PUBLIC_URL',
  'MEDIA_MAX_FILE_SIZE_BYTES',
  'STORAGE_DELETION_WORKER_ENABLED',
  'STORAGE_DELETION_WORKER_INTERVAL_MS',
  'STORAGE_DELETION_WORKER_BATCH_SIZE',
  'STORAGE_DELETION_WORKER_MAX_ATTEMPTS',
  'STORAGE_DELETION_WORKER_BACKOFF_MS',
  'STORAGE_DELETION_WORKER_LOCK_TIMEOUT_MS',
  'PAYMENT_DRIVER',
  'PAYMENTS_ENABLED',
  'PAYPAL_ENABLED',
  'PAYPAL_BASE_URL',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_RETURN_URL',
  'PAYPAL_CANCEL_URL',
];

describe('configuration factories', () => {
  const original = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of trackedKeys) {
      original.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    original.clear();
  });

  describe('app configuration', () => {
    it('falls back to development defaults when nothing is configured', () => {
      const config = appConfig();

      expect(config).toMatchObject({
        host: '0.0.0.0',
        port: 8000,
        env: 'development',
        frontendUrl: 'http://localhost:3000',
        corsOrigins: ['http://localhost:3000'],
        internalApiKey: 'development-internal-api-key-change-me',
        scheduledPublishingIntervalMs: 60_000,
        resourceDownloadLogRetentionDays: 365,
        resourceDownloadLogCleanupIntervalMs: 86_400_000,
        rateLimitTtlMs: 60_000,
        rateLimitRequests: 100,
        httpSlowRequestMs: 750,
      });
    });

    it('reads every provided override', () => {
      process.env.API_HOST = '127.0.0.1';
      process.env.API_PORT = '9001';
      process.env.NODE_ENV = 'staging';
      process.env.INTERNAL_API_KEY = 'a'.repeat(32);
      process.env.SCHEDULED_PUBLISHING_INTERVAL_MS = '1000';
      process.env.RESOURCE_DOWNLOAD_LOG_RETENTION_DAYS = '30';
      process.env.RESOURCE_DOWNLOAD_LOG_CLEANUP_INTERVAL_MS = '2000';
      process.env.RATE_LIMIT_TTL_MS = '5000';
      process.env.RATE_LIMIT_REQUESTS = '7';
      process.env.HTTP_SLOW_REQUEST_MS = '250';
      process.env.HTTP_LOG_SUCCESS_SAMPLE_RATE = '0.5';

      expect(appConfig()).toMatchObject({
        host: '127.0.0.1',
        port: 9001,
        env: 'staging',
        internalApiKey: 'a'.repeat(32),
        scheduledPublishingIntervalMs: 1000,
        resourceDownloadLogRetentionDays: 30,
        resourceDownloadLogCleanupIntervalMs: 2000,
        rateLimitTtlMs: 5000,
        rateLimitRequests: 7,
        httpSlowRequestMs: 250,
        httpSuccessLogSampleRate: 0.5,
      });
    });

    it('splits, trims and de-slashes a comma separated origin list', () => {
      process.env.FRONTEND_URL = ' https://nehemiah.org/ , https://www.nehemiah.org// ,,';

      const config = appConfig();

      expect(config.frontendUrl).toBe('https://nehemiah.org/');
      expect(config.corsOrigins).toEqual(['https://nehemiah.org', 'https://www.nehemiah.org']);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('honours an explicit SCHEDULED_PUBLISHING_ENABLED of %s', (value, expected) => {
      process.env.SCHEDULED_PUBLISHING_ENABLED = value;
      expect(appConfig().scheduledPublishingEnabled).toBe(expected);
    });

    it.each([
      ['test', false],
      ['production', true],
    ])('defaults scheduled publishing from NODE_ENV %s', (nodeEnv, expected) => {
      process.env.NODE_ENV = nodeEnv;
      expect(appConfig().scheduledPublishingEnabled).toBe(expected);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('honours an explicit RESOURCE_DOWNLOAD_LOG_CLEANUP_ENABLED of %s', (value, expected) => {
      process.env.RESOURCE_DOWNLOAD_LOG_CLEANUP_ENABLED = value;
      expect(appConfig().resourceDownloadLogCleanupEnabled).toBe(expected);
    });

    it.each([
      ['test', false],
      ['production', true],
    ])('defaults download-log cleanup from NODE_ENV %s', (nodeEnv, expected) => {
      process.env.NODE_ENV = nodeEnv;
      expect(appConfig().resourceDownloadLogCleanupEnabled).toBe(expected);
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('honours an explicit SWAGGER_ENABLED of %s', (value, expected) => {
      process.env.SWAGGER_ENABLED = value;
      expect(appConfig().swaggerEnabled).toBe(expected);
    });

    it.each([
      ['production', false],
      ['development', true],
    ])('defaults swagger exposure from NODE_ENV %s', (nodeEnv, expected) => {
      process.env.NODE_ENV = nodeEnv;
      expect(appConfig().swaggerEnabled).toBe(expected);
    });

    it('samples almost no successful request logs in production', () => {
      process.env.NODE_ENV = 'production';
      expect(appConfig().httpSuccessLogSampleRate).toBe(0.01);
    });

    it('logs every successful request outside production', () => {
      process.env.NODE_ENV = 'development';
      expect(appConfig().httpSuccessLogSampleRate).toBe(1);
    });
  });

  describe('mail configuration', () => {
    it('falls back to the local Mailpit defaults', () => {
      expect(mailConfig()).toMatchObject({
        host: 'mailpit',
        port: 1025,
        from: 'noreply@nehemiah.local',
        contactNotificationEmail: 'contact@nehemiah.local',
        connectionTimeoutMs: 3_000,
        greetingTimeoutMs: 3_000,
        socketTimeoutMs: 10_000,
        passwordResetTtlMinutes: 20,
        passwordResetUrl: 'http://localhost:3000/admin/reset-password',
        outboxWorkerIntervalMs: 5_000,
        outboxWorkerBatchSize: 10,
        outboxWorkerMaxAttempts: 5,
        outboxWorkerBackoffMs: 30_000,
        outboxWorkerLockTimeoutMs: 300_000,
      });
    });

    it('reads every provided override', () => {
      process.env.MAIL_HOST = 'smtp.example.org';
      process.env.MAIL_PORT = '587';
      process.env.MAIL_FROM = 'hello@nehemiah.org';
      process.env.CONTACT_NOTIFICATION_EMAIL = 'team@nehemiah.org';
      process.env.MAIL_CONNECTION_TIMEOUT_MS = '1';
      process.env.MAIL_GREETING_TIMEOUT_MS = '2';
      process.env.MAIL_SOCKET_TIMEOUT_MS = '3';
      process.env.PASSWORD_RESET_TTL_MINUTES = '45';
      process.env.PASSWORD_RESET_URL = 'https://nehemiah.org/reset';
      process.env.OUTBOX_WORKER_INTERVAL_MS = '4';
      process.env.OUTBOX_WORKER_BATCH_SIZE = '5';
      process.env.OUTBOX_WORKER_MAX_ATTEMPTS = '6';
      process.env.OUTBOX_WORKER_BACKOFF_MS = '7';
      process.env.OUTBOX_WORKER_LOCK_TIMEOUT_MS = '8';

      expect(mailConfig()).toMatchObject({
        host: 'smtp.example.org',
        port: 587,
        from: 'hello@nehemiah.org',
        contactNotificationEmail: 'team@nehemiah.org',
        connectionTimeoutMs: 1,
        greetingTimeoutMs: 2,
        socketTimeoutMs: 3,
        passwordResetTtlMinutes: 45,
        passwordResetUrl: 'https://nehemiah.org/reset',
        outboxWorkerIntervalMs: 4,
        outboxWorkerBatchSize: 5,
        outboxWorkerMaxAttempts: 6,
        outboxWorkerBackoffMs: 7,
        outboxWorkerLockTimeoutMs: 8,
      });
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('honours an explicit OUTBOX_WORKER_ENABLED of %s', (value, expected) => {
      process.env.OUTBOX_WORKER_ENABLED = value;
      expect(mailConfig().outboxWorkerEnabled).toBe(expected);
    });

    it.each([
      ['test', false],
      ['production', true],
    ])('defaults the outbox worker from NODE_ENV %s', (nodeEnv, expected) => {
      process.env.NODE_ENV = nodeEnv;
      expect(mailConfig().outboxWorkerEnabled).toBe(expected);
    });
  });

  describe('storage configuration', () => {
    it('falls back to the local MinIO defaults', () => {
      expect(storageConfig()).toMatchObject({
        endpoint: 'http://localhost:9000',
        region: 'auto',
        bucket: 'nehemiah-media',
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
        publicUrl: 'http://localhost:9000/nehemiah-media',
        maxFileSizeBytes: 10_485_760,
        deletionWorkerIntervalMs: 5_000,
        deletionWorkerBatchSize: 10,
        deletionWorkerMaxAttempts: 5,
        deletionWorkerBackoffMs: 30_000,
        deletionWorkerLockTimeoutMs: 300_000,
      });
    });

    it('reads every provided override and trims trailing slashes from the public url', () => {
      process.env.STORAGE_ENDPOINT = 'https://s3.example.org';
      process.env.STORAGE_REGION = 'eu-west-1';
      process.env.STORAGE_BUCKET = 'media';
      process.env.STORAGE_ACCESS_KEY_ID = 'key';
      process.env.STORAGE_SECRET_ACCESS_KEY = 'secret';
      process.env.STORAGE_PUBLIC_URL = 'https://cdn.example.org/media///';
      process.env.MEDIA_MAX_FILE_SIZE_BYTES = '2048';
      process.env.STORAGE_DELETION_WORKER_INTERVAL_MS = '1';
      process.env.STORAGE_DELETION_WORKER_BATCH_SIZE = '2';
      process.env.STORAGE_DELETION_WORKER_MAX_ATTEMPTS = '3';
      process.env.STORAGE_DELETION_WORKER_BACKOFF_MS = '4';
      process.env.STORAGE_DELETION_WORKER_LOCK_TIMEOUT_MS = '5';

      expect(storageConfig()).toMatchObject({
        endpoint: 'https://s3.example.org',
        region: 'eu-west-1',
        bucket: 'media',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        publicUrl: 'https://cdn.example.org/media',
        maxFileSizeBytes: 2048,
        deletionWorkerIntervalMs: 1,
        deletionWorkerBatchSize: 2,
        deletionWorkerMaxAttempts: 3,
        deletionWorkerBackoffMs: 4,
        deletionWorkerLockTimeoutMs: 5,
      });
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('honours an explicit STORAGE_DELETION_WORKER_ENABLED of %s', (value, expected) => {
      process.env.STORAGE_DELETION_WORKER_ENABLED = value;
      expect(storageConfig().deletionWorkerEnabled).toBe(expected);
    });

    it.each([
      ['test', false],
      ['production', true],
    ])('defaults the deletion worker from NODE_ENV %s', (nodeEnv, expected) => {
      process.env.NODE_ENV = nodeEnv;
      expect(storageConfig().deletionWorkerEnabled).toBe(expected);
    });
  });

  describe('payment configuration', () => {
    it('defaults to the fake driver with collection disabled', () => {
      expect(paymentConfig()).toMatchObject({
        driver: 'fake',
        enabled: false,
        paypal: {
          enabled: false,
          baseUrl: 'https://api-m.sandbox.paypal.com',
          clientId: '',
          clientSecret: '',
          webhookId: '',
          returnUrl: 'http://localhost:3000/donate/success',
          cancelUrl: 'http://localhost:3000/donate/cancel',
        },
      });
    });

    it('enables PayPal only when driver, payments and provider flags all agree', () => {
      process.env.PAYMENT_DRIVER = 'paypal';
      process.env.PAYMENTS_ENABLED = 'true';
      process.env.PAYPAL_ENABLED = 'true';
      process.env.PAYPAL_CLIENT_ID = 'client';
      process.env.PAYPAL_CLIENT_SECRET = 'secret';
      process.env.PAYPAL_WEBHOOK_ID = 'hook';
      process.env.PAYPAL_BASE_URL = 'https://api-m.paypal.com';
      process.env.PAYPAL_RETURN_URL = 'https://nehemiah.org/donate/success';
      process.env.PAYPAL_CANCEL_URL = 'https://nehemiah.org/donate/cancel';

      expect(paymentConfig()).toMatchObject({
        driver: 'paypal',
        enabled: true,
        paypal: {
          enabled: true,
          baseUrl: 'https://api-m.paypal.com',
          clientId: 'client',
          clientSecret: 'secret',
          webhookId: 'hook',
          returnUrl: 'https://nehemiah.org/donate/success',
          cancelUrl: 'https://nehemiah.org/donate/cancel',
        },
      });
    });

    it.each([
      ['fake', 'true', 'true'],
      ['paypal', 'false', 'true'],
      ['paypal', 'true', 'false'],
    ])(
      'keeps PayPal disabled for driver=%s payments=%s provider=%s',
      (driver, payments, provider) => {
        process.env.PAYMENT_DRIVER = driver;
        process.env.PAYMENTS_ENABLED = payments;
        process.env.PAYPAL_ENABLED = provider;

        expect(paymentConfig().paypal.enabled).toBe(false);
      },
    );
  });
});
