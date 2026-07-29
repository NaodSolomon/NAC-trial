import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Donation } from '../../../database/schema';
import { FakePaymentGateway } from './fake-payment.gateway';

describe('FakePaymentGateway', () => {
  const config = {
    get: jest.fn((key: string) => (key === 'runtime.paymentDriver' ? 'fake' : undefined)),
    getOrThrow: jest.fn((key: string) =>
      key === 'app.frontendUrl' ? 'http://localhost:3000' : undefined,
    ),
  } as unknown as ConfigService;
  const gateway = new FakePaymentGateway(config);

  it('creates a visibly simulated checkout without a network request', async () => {
    const donation = {
      id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
    } as Donation;
    await expect(gateway.createCheckout(donation)).resolves.toEqual({
      providerOrderId: `FAKE-${donation.id}`,
      paymentUrl: `http://localhost:3000/donate/simulated?donation=${donation.id}`,
    });
  });

  it('rejects fake webhooks without the local-only signature', async () => {
    await expect(
      gateway.verifyWebhook(
        {
          transmissionId: '',
          transmissionTime: '',
          transmissionSignature: 'wrong',
          certificateUrl: '',
          authenticationAlgorithm: '',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
