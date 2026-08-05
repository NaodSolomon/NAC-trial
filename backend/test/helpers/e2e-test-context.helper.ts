import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { admins, cmsPages, siteSettings } from '../../src/database/schema';
import {
  ObjectStorage,
  OBJECT_STORAGE,
} from '../../src/modules/media/interfaces/object-storage.interface';
import {
  PaymentGateway,
  PAYMENT_GATEWAY,
} from '../../src/modules/donations/interfaces/payment-gateway.interface';
import { cleanTestDatabase } from './database-cleaner.helper';
import { connectTestPostgres, PostgresTestContext } from './postgres-test.helper';
import { requireDedicatedTestDatabase } from './test-database-safety.helper';
import { createTestApp } from './test-app.helper';
import { MAILER, Mailer } from '../../src/modules/mail/mail.interface';
import { ApplicationCache, CACHE } from '../../src/modules/cache/cache.interface';

export const E2E_PASSWORD = 'TestingPassword123';

export interface E2eActors {
  superAdmin: { id: string; email: string };
  editor: { id: string; email: string };
  finance: { id: string; email: string };
}

interface BaseE2eTestContext extends PostgresTestContext {
  app: INestApplication;
  actors: E2eActors;
  storage: jest.Mocked<ObjectStorage>;
  gateway: jest.Mocked<PaymentGateway>;
  cache: {
    ping: jest.Mock;
    remember: jest.Mock;
    invalidate: jest.Mock;
    clear: jest.Mock;
  };
}

export interface E2eTestContext extends BaseE2eTestContext {
  mailer: jest.Mocked<Mailer>;
}

export type MailpitE2eTestContext = BaseE2eTestContext;

export async function createE2eTestContext(): Promise<E2eTestContext> {
  const mailer: jest.Mocked<Mailer> = { send: jest.fn().mockResolvedValue(undefined) };
  const context = await createBaseE2eTestContext(mailer);
  return { ...context, mailer };
}

export async function createMailpitE2eTestContext(): Promise<MailpitE2eTestContext> {
  const previousHost = process.env.MAIL_HOST;
  const previousPort = process.env.MAIL_PORT;
  process.env.MAIL_HOST = process.env.TEST_MAIL_HOST ?? '127.0.0.1';
  process.env.MAIL_PORT = process.env.TEST_MAIL_PORT ?? '1026';

  try {
    return await createBaseE2eTestContext();
  } finally {
    restoreEnvironment('MAIL_HOST', previousHost);
    restoreEnvironment('MAIL_PORT', previousPort);
  }
}

async function createBaseE2eTestContext(mailer?: jest.Mocked<Mailer>): Promise<BaseE2eTestContext> {
  const databaseUrl = requireDedicatedTestDatabase();
  const postgres = await connectTestPostgres();
  await cleanTestDatabase(postgres);
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 4);
  const actors: E2eActors = {
    superAdmin: { id: randomUUID(), email: 'super-admin@e2e.test' },
    editor: { id: randomUUID(), email: 'content-editor@e2e.test' },
    finance: { id: randomUUID(), email: 'finance-viewer@e2e.test' },
  };
  await postgres.db.insert(admins).values([
    {
      ...actors.superAdmin,
      name: 'E2E Super Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    { ...actors.editor, name: 'E2E Content Editor', passwordHash, role: 'CONTENT_EDITOR' },
    { ...actors.finance, name: 'E2E Finance Viewer', passwordHash, role: 'FINANCE_VIEWER' },
  ]);
  await postgres.db.insert(siteSettings).values({
    siteName: 'Nehemiah Autism Center',
    contactEmail: 'contact@nehemiah.test',
    phone: '+251 911 000 000',
    address: 'Addis Ababa, Ethiopia',
    updatedBy: actors.superAdmin.id,
  });
  await postgres.db.insert(cmsPages).values([
    {
      slug: 'contact',
      languageCode: 'en',
      title: 'Contact us',
      content: 'Contact the Nehemiah Autism Center team.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: actors.superAdmin.id,
    },
    {
      slug: 'volunteer',
      languageCode: 'en',
      title: 'Volunteer',
      content: 'Join the Nehemiah Autism Center volunteer community.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: actors.superAdmin.id,
    },
    {
      slug: 'home',
      languageCode: 'en',
      title: 'Nehemiah Autism Center',
      content: 'Welcome to our demonstration homepage.',
      metadata: { sections: [{ type: 'hero', heading: 'Support starts here' }] },
      seoTitle: 'Nehemiah Autism Center',
      seoDescription: 'Autism support, education, and community.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: actors.superAdmin.id,
    },
    {
      slug: 'faq',
      languageCode: 'en',
      title: 'Frequently asked questions',
      content: 'Answers for families.',
      metadata: { items: [{ question: 'How can I get help?', answer: 'Contact our team.' }] },
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: actors.superAdmin.id,
    },
  ]);
  const storage: jest.Mocked<ObjectStorage> = {
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    publicUrl: jest.fn((key: string) => `https://storage.e2e.test/${key}`),
  };
  const gateway: jest.Mocked<PaymentGateway> = {
    isEnabled: jest.fn().mockReturnValue(true),
    createCheckout: jest.fn(async (donation) => ({
      providerOrderId: `SIM-${donation.id}`,
      paymentUrl: `https://payments.e2e.test/${donation.id}`,
    })),
    verifyWebhook: jest.fn(async (_headers, event) => ({
      eventId: String(event.id ?? 'SIMULATED-EVENT'),
      eventType: String(event.event_type ?? 'PAYMENT.CAPTURE.COMPLETED'),
      providerOrderId: String(event.providerOrderId ?? ''),
      transactionId: String(event.transactionId ?? 'SIMULATED-CAPTURE'),
      status: 'CONFIRMED' as const,
    })),
  };
  const cache = {
    ping: jest.fn().mockResolvedValue(true),
    remember: jest.fn(async (_namespace, _key, _ttl, loader) => loader()),
    invalidate: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const app = await createTestApp({
    databaseUrl,
    configureModule: (builder) => {
      let configured = builder
        .overrideProvider(OBJECT_STORAGE)
        .useValue(storage)
        .overrideProvider(PAYMENT_GATEWAY)
        .useValue(gateway)
        .overrideProvider(CACHE)
        .useValue(cache as unknown as ApplicationCache);
      if (mailer) configured = configured.overrideProvider(MAILER).useValue(mailer);
      return configured;
    },
  });
  return { ...postgres, app, actors, storage, gateway, cache };
}

export async function closeE2eTestContext(context: BaseE2eTestContext): Promise<void> {
  await context.app.close();
  await context.pool.end();
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
