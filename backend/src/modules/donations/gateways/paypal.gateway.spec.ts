import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayPalGateway } from './paypal.gateway';

describe('PayPalGateway webhook verification', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects a webhook when PayPal does not validate its signature', async () => {
    const values: Record<string, string> = {
      'payment.paypal.baseUrl': 'https://api-m.sandbox.paypal.com',
      'payment.paypal.clientId': 'client-id',
      'payment.paypal.clientSecret': 'client-secret',
      'payment.paypal.webhookId': 'webhook-id',
    };
    const config = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'FAILURE' }),
      }) as unknown as typeof fetch;
    const gateway = new PayPalGateway(config);

    await expect(
      gateway.verifyWebhook(
        {
          authenticationAlgorithm: 'SHA256withRSA',
          certificateUrl: 'https://api.paypal.com/cert',
          transmissionId: 'transmission-id',
          transmissionSignature: 'invalid-signature',
          transmissionTime: new Date().toISOString(),
        },
        { id: 'event-id', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
