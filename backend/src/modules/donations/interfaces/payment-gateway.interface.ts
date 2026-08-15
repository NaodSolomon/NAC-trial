import { Donation } from '../../../database/schema';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface GatewayCheckout {
  providerOrderId: string;
  paymentUrl: string;
}

export interface PayPalWebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  transmissionSignature: string;
  certificateUrl: string;
  authenticationAlgorithm: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  eventType: string;
  providerOrderId: string | null;
  transactionId: string | null;
  status: 'CONFIRMED' | 'FAILED' | null;
}

export interface PaymentGateway {
  readonly gateway: Donation['gateway'];
  isEnabled(): boolean;
  createCheckout(donation: Donation): Promise<GatewayCheckout>;
  verifyWebhook(
    headers: PayPalWebhookHeaders,
    event: Record<string, unknown>,
  ): Promise<VerifiedPaymentEvent>;
}
