import * as request from 'supertest';
import { authenticatedSession, TestSession } from '../helpers/auth-test.helper';
import {
  closeE2eTestContext,
  createE2eTestContext,
  E2eTestContext,
  E2E_PASSWORD,
} from '../helpers/e2e-test-context.helper';

const donationPayload = (email: string) => ({
  amount: 25,
  currency: 'USD',
  gateway: 'SIMULATED',
  donorName: 'E2E Donor',
  donorEmail: email,
  message: 'Simulated donation for local end-to-end testing.',
});

describe('Donations in simulated mode (e2e)', () => {
  let context: E2eTestContext;
  let superAdmin: TestSession;
  let editor: TestSession;
  let finance: TestSession;

  beforeAll(async () => {
    context = await createE2eTestContext();
    superAdmin = await authenticatedSession(context.app, context.actors.superAdmin.email, E2E_PASSWORD);
    editor = await authenticatedSession(context.app, context.actors.editor.email, E2E_PASSWORD);
    finance = await authenticatedSession(context.app, context.actors.finance.email, E2E_PASSWORD);
  });
  afterAll(async () => closeE2eTestContext(context));

  it('initiates, reads, and cancels a donation without a payment network', async () => {
    await request(context.app.getHttpServer())
      .get('/api/v1/public/donations/gateways')
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual(['SIMULATED']));
    const initiated = await request(context.app.getHttpServer())
      .post('/api/v1/public/donations')
      .send(donationPayload('cancelled-donor@e2e.test'))
      .expect(201);
    const id = initiated.body.data.donationId as string;
    expect(initiated.body.data.paymentUrl).toContain('payments.e2e.test');
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/donations/${id}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.gateway).toBe('SIMULATED'));
    await request(context.app.getHttpServer())
      .post(`/api/v1/public/donations/${id}/cancel`)
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe('CANCELLED'));
  });

  it('enforces finance roles and covers verification, receipts, stats, and export', async () => {
    const initiated = await request(context.app.getHttpServer())
      .post('/api/v1/public/donations')
      .send(donationPayload('confirmed-donor@e2e.test'))
      .expect(201);
    const id = initiated.body.data.donationId as string;
    await request(context.app.getHttpServer()).get('/api/v1/admin/donations').expect(401);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/donations')
      .set('Authorization', editor.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/donations')
      .set('Authorization', finance.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/donations/${id}`)
      .set('Authorization', finance.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/donations/${id}/verify`)
      .set('Authorization', finance.authorization)
      .expect(403);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/donations/${id}/verify`)
      .set('Authorization', superAdmin.authorization)
      .expect(201);
    await request(context.app.getHttpServer()).get('/api/v1/public/donations/recent').expect(200);
    await request(context.app.getHttpServer())
      .get(`/api/v1/admin/donations/${id}/receipt`)
      .set('Authorization', finance.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .post(`/api/v1/admin/donations/${id}/resend-receipt`)
      .set('Authorization', finance.authorization)
      .expect(201);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/donations/stats')
      .set('Authorization', finance.authorization)
      .expect(200);
    await request(context.app.getHttpServer())
      .get('/api/v1/admin/donations/export')
      .set('Authorization', finance.authorization)
      .expect('Content-Type', /text\/csv/)
      .expect(({ text }) => {
        expect(text).toContain('SIMULATED');
        expect(text).not.toContain('PAYPAL');
      })
      .expect(200);
  });

  it('handles a signed simulated webhook and fails closed for unavailable providers', async () => {
    const initiated = await request(context.app.getHttpServer())
      .post('/api/v1/public/donations')
      .send(donationPayload('webhook-donor@e2e.test'))
      .expect(201);
    const id = initiated.body.data.donationId as string;
    await request(context.app.getHttpServer())
      .post('/api/v1/webhooks/paypal')
      .set('paypal-transmission-id', 'E2E-TRANSMISSION')
      .set('paypal-transmission-time', new Date().toISOString())
      .set('paypal-transmission-sig', 'simulated-signature')
      .set('paypal-cert-url', 'https://payments.e2e.test/cert')
      .set('paypal-auth-algo', 'SHA256withRSA')
      .send({
        id: 'E2E-WEBHOOK',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        providerOrderId: `SIM-${id}`,
        transactionId: 'E2E-CAPTURE',
      })
      .expect(201);
    await request(context.app.getHttpServer())
      .get(`/api/v1/public/donations/${id}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.status).toBe('CONFIRMED'));
    await request(context.app.getHttpServer()).post('/api/v1/webhooks/telebirr').send({}).expect(503);
    await request(context.app.getHttpServer()).post('/api/v1/webhooks/cbe').send({}).expect(503);
  });


  it('confirms, fails, and deduplicates trial payments without collecting payment details', async () => {
    const confirmed = await request(context.app.getHttpServer())
      .post('/api/v1/public/donations')
      .send(donationPayload('receipt-donor@e2e.test'))
      .expect(201);
    const confirmedId = confirmed.body.data.donationId as string;

    await request(context.app.getHttpServer())
      .post(`/api/v1/test/payments/${confirmedId}/confirm`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({ status: 'CONFIRMED', duplicate: false });
        expect(body.data.receiptUrl).toContain('/receipts/');
      });
    await request(context.app.getHttpServer())
      .post(`/api/v1/test/payments/${confirmedId}/confirm`)
      .expect(201)
      .expect(({ body }) => expect(body.data.duplicate).toBe(true));
    expect(context.mailer.send).toHaveBeenCalledTimes(1);

    const retry = await request(context.app.getHttpServer())
      .post('/api/v1/public/donations')
      .send(donationPayload('failed-donor@e2e.test'))
      .expect(201);
    await request(context.app.getHttpServer())
      .post(`/api/v1/test/payments/${retry.body.data.donationId}/fail`)
      .expect(201)
      .expect(({ body }) => expect(body.data.status).toBe('FAILED'));
  });
});
