import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

const UNCONFIGURED_GATEWAYS = ['TELEBIRR', 'CBE'] as const;

const validPayloadFor = (gateway: string) => ({
  amount: 25,
  currency: 'USD',
  gateway,
  donorName: 'Fail Closed Donor',
  donorEmail: `${gateway.toLowerCase()}-donor@e2e.test`,
  message: 'Every field except the gateway is valid.',
});

describe('Donations fail closed for unconfigured gateways (e2e)', () => {
  let context: E2eTestContext;
  let finance: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('never advertises an unconfigured gateway', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/public/donations/gateways')
      .expect(200)
      .expect(({ body }) => {
        for (const gateway of UNCONFIGURED_GATEWAYS) {
          expect(body.data).not.toContain(gateway);
        }
      });
  });

  it.each(UNCONFIGURED_GATEWAYS)(
    'rejects an otherwise-valid %s donation and persists nothing',
    async (gateway) => {
      const rejected = await request(context.app.getHttpServer())
        .post('/api/v1/public/donations')
        .send(validPayloadFor(gateway))
        .expect(400);
      expect(rejected.body.data?.paymentUrl).toBeUndefined();
      expect(rejected.body.data?.donationId).toBeUndefined();

      await request(context.app.getHttpServer())
        .get(`/api/v1/admin/donations?gateway=${gateway}`)
        .set('Authorization', finance.authorization)
        .expect(200)
        .expect(({ body }) => expect(body.data.meta.total).toBe(0));
    },
  );

  it.each(['/api/v1/webhooks/telebirr', '/api/v1/webhooks/cbe'])(
    'refuses webhook deliveries on %s',
    async (endpoint) => {
      await request(context.app.getHttpServer())
        .post(endpoint)
        .send({ id: 'UNSOLICITED', event_type: 'PAYMENT.CAPTURE.COMPLETED' })
        .expect(503);
    },
  );

  it('records no donation from a refused webhook delivery', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/donations')
      .set('Authorization', finance.authorization)
      .expect(200)
      .expect(({ body }) => expect(body.data.meta.total).toBe(0));
  });
});
