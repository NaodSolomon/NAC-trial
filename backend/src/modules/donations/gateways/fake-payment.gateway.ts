import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Donation } from '../../../database/schema';
import {
  GatewayCheckout,
  PayPalWebhookHeaders,
  PaymentGateway,
  VerifiedPaymentEvent,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class FakePaymentGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.config.get<string>('runtime.paymentDriver') === 'fake' &&
      this.config.get<boolean>('runtime.trialMode') === true
    );
  }

  async createCheckout(donation: Donation): Promise<GatewayCheckout> {
    return {
      providerOrderId: `FAKE-${donation.id}`,
      paymentUrl: `${this.config.getOrThrow<string>('app.frontendUrl')}/donate/simulated?donation=${donation.id}`,
    };
  }

  async verifyWebhook(
    headers: PayPalWebhookHeaders,
    event: Record<string, unknown>,
  ): Promise<VerifiedPaymentEvent> {
    if (headers.transmissionSignature !== 'local-fake-signature') {
      throw new UnauthorizedException('Invalid fake payment signature');
    }
    return {
      eventId: String(event.id ?? ''),
      eventType: String(event.event_type ?? ''),
      providerOrderId: typeof event.providerOrderId === 'string' ? event.providerOrderId : null,
      transactionId: typeof event.transactionId === 'string' ? event.transactionId : null,
      status:
        event.status === 'CONFIRMED' || event.status === 'FAILED'
          ? event.status
          : null,
    };
  }
}
