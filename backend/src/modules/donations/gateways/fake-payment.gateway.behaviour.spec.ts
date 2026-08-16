import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Donation } from '../../../database/schema';
import { FakePaymentGateway } from './fake-payment.gateway';

function configWith(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    'runtime.paymentDriver': 'fake',
    'runtime.trialMode': true,
    'app.frontendUrl': 'http://localhost:3000',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

const donation = { id: 'donation-id' } as unknown as Donation;

const signedHeaders = {
  authenticationAlgorithm: 'none',
  certificateUrl: 'http://localhost/cert',
  transmissionId: 'transmission',
  transmissionSignature: 'local-fake-signature',
  transmissionTime: '2026-08-16T00:00:00.000Z',
};

describe('FakePaymentGateway', () => {
  it('identifies itself as the simulated provider', () => {
    expect(new FakePaymentGateway(configWith()).gateway).toBe('SIMULATED');
  });

  describe('isEnabled', () => {
    it('is enabled for the fake driver in trial mode', () => {
      expect(new FakePaymentGateway(configWith()).isEnabled()).toBe(true);
    });

    it.each([
      ['runtime.paymentDriver', 'paypal'],
      ['runtime.trialMode', false],
    ])('is disabled when %s is %p', (key, value) => {
      expect(new FakePaymentGateway(configWith({ [key]: value })).isEnabled()).toBe(false);
    });
  });

  it('builds a checkout url that is visibly simulated', async () => {
    await expect(new FakePaymentGateway(configWith()).createCheckout(donation)).resolves.toEqual({
      providerOrderId: 'FAKE-donation-id',
      paymentUrl: 'http://localhost:3000/donate/simulated?donation=donation-id',
    });
  });

  describe('verifyWebhook', () => {
    const gateway = () => new FakePaymentGateway(configWith());

    it('refuses a webhook without the local-only signature', async () => {
      await expect(
        gateway().verifyWebhook({ ...signedHeaders, transmissionSignature: 'wrong' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it.each(['CONFIRMED', 'FAILED'])('passes through the %s status', async (status) => {
      await expect(
        gateway().verifyWebhook(signedHeaders, {
          id: 'event',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          providerOrderId: 'FAKE-donation-id',
          transactionId: 'capture',
          status,
        }),
      ).resolves.toEqual({
        eventId: 'event',
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        providerOrderId: 'FAKE-donation-id',
        transactionId: 'capture',
        status,
      });
    });

    it('discards an unrecognised status', async () => {
      await expect(
        gateway().verifyWebhook(signedHeaders, { status: 'PENDING' }),
      ).resolves.toMatchObject({ status: null });
    });

    it('defaults every missing field', async () => {
      await expect(gateway().verifyWebhook(signedHeaders, {})).resolves.toEqual({
        eventId: '',
        eventType: '',
        providerOrderId: null,
        transactionId: null,
        status: null,
      });
    });

    it('ignores non-string identifiers', async () => {
      await expect(
        gateway().verifyWebhook(signedHeaders, { providerOrderId: 7, transactionId: {} }),
      ).resolves.toMatchObject({ providerOrderId: null, transactionId: null });
    });
  });
});
