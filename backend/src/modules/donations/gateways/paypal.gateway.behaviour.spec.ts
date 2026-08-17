import { BadGatewayException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Donation } from '../../../database/schema';
import { PayPalGateway } from './paypal.gateway';

const configValues: Record<string, unknown> = {
  'payment.driver': 'paypal',
  'payment.enabled': true,
  'payment.paypal.enabled': true,
  'payment.paypal.baseUrl': 'https://api-m.sandbox.paypal.com',
  'payment.paypal.clientId': 'client-id',
  'payment.paypal.clientSecret': 'client-secret',
  'payment.paypal.webhookId': 'webhook-id',
  'payment.paypal.returnUrl': 'https://nehemiah.org/donate/success',
  'payment.paypal.cancelUrl': 'https://nehemiah.org/donate/cancel',
};

function configWith(overrides: Record<string, unknown> = {}): ConfigService {
  const values = { ...configValues, ...overrides };
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const donation = { id: 'donation-id', currency: 'USD', amount: '25.00' } as unknown as Donation;

const webhookHeaders = {
  authenticationAlgorithm: 'SHA256withRSA',
  certificateUrl: 'https://api.paypal.com/cert',
  transmissionId: 'transmission-id',
  transmissionSignature: 'signature',
  transmissionTime: '2026-08-16T00:00:00.000Z',
};

function mockFetch(...responses: Array<Partial<Response> & { json?: () => Promise<unknown> }>) {
  const fn = jest.fn();
  for (const response of responses) {
    fn.mockResolvedValueOnce({ ok: true, status: 200, ...response });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const tokenResponse = { json: async () => ({ access_token: 'access-token' }) };

describe('PayPalGateway', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('is enabled only when driver, payments and the provider flag all agree', () => {
      expect(new PayPalGateway(configWith()).isEnabled()).toBe(true);
    });

    it.each([
      ['payment.driver', 'fake'],
      ['payment.enabled', false],
      ['payment.paypal.enabled', false],
    ])('is disabled when %s is %p', (key, value) => {
      expect(new PayPalGateway(configWith({ [key]: value })).isEnabled()).toBe(false);
    });
  });

  describe('createCheckout', () => {
    it('returns the order id and payer-action link', async () => {
      mockFetch(tokenResponse, {
        json: async () => ({
          id: 'order-id',
          links: [
            { rel: 'self', href: 'https://api.paypal.com/self' },
            { rel: 'payer-action', href: 'https://paypal.com/checkout/order-id' },
          ],
        }),
      });

      await expect(new PayPalGateway(configWith()).createCheckout(donation)).resolves.toEqual({
        providerOrderId: 'order-id',
        paymentUrl: 'https://paypal.com/checkout/order-id',
      });
    });

    it('rejects a response with no payer-action link', async () => {
      mockFetch(tokenResponse, {
        json: async () => ({ id: 'order-id', links: [{ rel: 'self', href: 'https://x' }] }),
      });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('rejects a response with no links at all', async () => {
      mockFetch(tokenResponse, { json: async () => ({ id: 'order-id' }) });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('rejects a response with no order id', async () => {
      mockFetch(tokenResponse, {
        json: async () => ({ links: [{ rel: 'payer-action', href: 'https://paypal.com/x' }] }),
      });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('authentication', () => {
    it('fails when the token endpoint rejects the credentials', async () => {
      mockFetch({ ok: false, status: 401, json: async () => ({}) });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('fails when the token endpoint returns no access token', async () => {
      mockFetch({ json: async () => ({}) });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });

    it('sends basic credentials and reuses the bearer token for the order call', async () => {
      const fetchMock = mockFetch(tokenResponse, {
        json: async () => ({
          id: 'order-id',
          links: [{ rel: 'payer-action', href: 'https://paypal.com/checkout' }],
        }),
      });

      await new PayPalGateway(configWith()).createCheckout(donation);

      const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
      expect(tokenUrl).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
      expect((tokenInit as RequestInit).headers).toMatchObject({
        Authorization: `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
      });

      const [orderUrl, orderInit] = fetchMock.mock.calls[1];
      expect(orderUrl).toBe('https://api-m.sandbox.paypal.com/v2/checkout/orders');
      expect((orderInit as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer access-token',
        'PayPal-Request-Id': 'donation-id',
      });
    });

    it('surfaces a failing order request as a bad gateway', async () => {
      mockFetch(tokenResponse, { ok: false, status: 503, json: async () => ({}) });

      await expect(
        new PayPalGateway(configWith()).createCheckout(donation),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('verifyWebhook', () => {
    async function verify(event: Record<string, unknown>) {
      mockFetch(tokenResponse, { json: async () => ({ verification_status: 'SUCCESS' }) });
      return new PayPalGateway(configWith()).verifyWebhook(webhookHeaders, event);
    }

    it('rejects an unverified signature', async () => {
      mockFetch(tokenResponse, { json: async () => ({ verification_status: 'FAILURE' }) });

      await expect(
        new PayPalGateway(configWith()).verifyWebhook(webhookHeaders, { id: 'e' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('maps a completed capture to CONFIRMED and reads the related order id', async () => {
      await expect(
        verify({
          id: 'event-id',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            id: 'capture-id',
            supplementary_data: { related_ids: { order_id: 'order-id' } },
          },
        }),
      ).resolves.toEqual({
        eventId: 'event-id',
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        providerOrderId: 'order-id',
        transactionId: 'capture-id',
        status: 'CONFIRMED',
      });
    });

    it('maps a denied capture to FAILED', async () => {
      await expect(
        verify({ id: 'e', event_type: 'PAYMENT.CAPTURE.DENIED', resource: { id: 'capture-id' } }),
      ).resolves.toMatchObject({ status: 'FAILED', transactionId: 'capture-id' });
    });

    it('leaves an unrelated event without a status', async () => {
      await expect(
        verify({ id: 'e', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'order-id' } }),
      ).resolves.toMatchObject({ status: null, providerOrderId: 'order-id' });
    });

    it('falls back to the resource id only for checkout order events', async () => {
      await expect(
        verify({ id: 'e', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'capture' } }),
      ).resolves.toMatchObject({ providerOrderId: null, transactionId: 'capture' });
    });

    it('tolerates an event with no resource at all', async () => {
      await expect(verify({ id: 'e', event_type: 'PAYMENT.CAPTURE.COMPLETED' })).resolves.toEqual({
        eventId: 'e',
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        providerOrderId: null,
        transactionId: null,
        status: 'CONFIRMED',
      });
    });

    it('tolerates missing identifiers', async () => {
      await expect(verify({})).resolves.toMatchObject({ eventId: '', eventType: '', status: null });
    });

    it('ignores a non-string related order id', async () => {
      await expect(
        verify({
          id: 'e',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { id: 'capture', supplementary_data: { related_ids: { order_id: 42 } } },
        }),
      ).resolves.toMatchObject({ providerOrderId: null });
    });
  });
});
