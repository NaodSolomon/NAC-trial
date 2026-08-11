import type { DonationCapabilities, DonationGateway, RuntimeInformation } from './donation.types';

export function deriveDonationCapabilities(
  runtime: RuntimeInformation,
  gateways: DonationGateway[],
): DonationCapabilities {
  const trialMode =
    runtime.mode === 'trial' &&
    runtime.environment !== 'production' &&
    runtime.adapters.payment === 'fake' &&
    runtime.realPaymentsEnabled === false;
  const productionPayments =
    runtime.mode === 'production' &&
    runtime.adapters.payment === 'paypal' &&
    runtime.realPaymentsEnabled;
  return {
    runtime,
    gateways,
    trialMode,
    trialControlsEnabled: trialMode,
    canCreateDonation: gateways.length > 0 && (trialMode || productionPayments),
  };
}
