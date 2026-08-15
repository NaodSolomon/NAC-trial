import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Donation } from '../../../database/schema';
import {
  GatewayCheckout,
  PayPalWebhookHeaders,
  PaymentGateway,
  VerifiedPaymentEvent,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class PayPalGateway implements PaymentGateway {
  readonly gateway = 'PAYPAL' as const;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.config.get<string>('payment.driver') === 'paypal' &&
      this.config.get<boolean>('payment.enabled') === true &&
      this.config.get<boolean>('payment.paypal.enabled') === true
    );
  }

  async createCheckout(donation: Donation): Promise<GatewayCheckout> {
    const response = await this.request('/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'PayPal-Request-Id': donation.id,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: donation.id,
            custom_id: donation.id,
            amount: { currency_code: donation.currency, value: donation.amount },
          },
        ],
        application_context: {
          return_url: this.config.getOrThrow<string>('payment.paypal.returnUrl'),
          cancel_url: this.config.getOrThrow<string>('payment.paypal.cancelUrl'),
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });
    const body = (await response.json()) as {
      id?: string;
      links?: Array<{ rel: string; href: string }>;
    };
    const paymentUrl = body.links?.find((link) => link.rel === 'payer-action')?.href;
    if (!body.id || !paymentUrl) {
      throw new BadGatewayException('PayPal did not return a checkout link');
    }
    return { providerOrderId: body.id, paymentUrl };
  }

  async verifyWebhook(
    headers: PayPalWebhookHeaders,
    event: Record<string, unknown>,
  ): Promise<VerifiedPaymentEvent> {
    const response = await this.request('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: JSON.stringify({
        auth_algo: headers.authenticationAlgorithm,
        cert_url: headers.certificateUrl,
        transmission_id: headers.transmissionId,
        transmission_sig: headers.transmissionSignature,
        transmission_time: headers.transmissionTime,
        webhook_id: this.config.getOrThrow<string>('payment.paypal.webhookId'),
        webhook_event: event,
      }),
    });
    const verification = (await response.json()) as { verification_status?: string };
    if (verification.verification_status !== 'SUCCESS') {
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }
    const resource = (event.resource ?? {}) as Record<string, unknown>;
    const related = ((resource.supplementary_data as Record<string, unknown> | undefined)
      ?.related_ids ?? {}) as Record<string, unknown>;
    const eventType = String(event.event_type ?? '');
    return {
      eventId: String(event.id ?? ''),
      eventType,
      providerOrderId:
        typeof related.order_id === 'string'
          ? related.order_id
          : typeof resource.id === 'string' && eventType.startsWith('CHECKOUT.ORDER.')
            ? resource.id
            : null,
      transactionId: typeof resource.id === 'string' ? resource.id : null,
      status:
        eventType === 'PAYMENT.CAPTURE.COMPLETED'
          ? 'CONFIRMED'
          : eventType === 'PAYMENT.CAPTURE.DENIED'
            ? 'FAILED'
            : null,
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.accessToken();
    const response = await fetch(
      `${this.config.getOrThrow<string>('payment.paypal.baseUrl')}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      },
    );
    if (!response.ok) {
      throw new BadGatewayException(`PayPal request failed with status ${response.status}`);
    }
    return response;
  }

  private async accessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.getOrThrow<string>('payment.paypal.clientId')}:${this.config.getOrThrow<string>('payment.paypal.clientSecret')}`,
    ).toString('base64');
    const response = await fetch(
      `${this.config.getOrThrow<string>('payment.paypal.baseUrl')}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
    );
    if (!response.ok) throw new BadGatewayException('PayPal authentication failed');
    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) throw new BadGatewayException('PayPal returned no access token');
    return body.access_token;
  }
}
