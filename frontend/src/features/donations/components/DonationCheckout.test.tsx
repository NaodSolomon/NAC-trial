import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DonationCheckout } from './DonationCheckout';
import type { DonationCapabilities, PublicDonation } from '../donation.types';

const productionCapabilities: DonationCapabilities = {
  runtime: {
    name: 'Nehemiah API',
    version: '1.0.0',
    environment: 'production',
    mode: 'production',
    adapters: { storage: 'r2', mail: 'smtp', payment: 'paypal', cache: 'redis' },
    realPaymentsEnabled: true,
  },
  gateways: ['PAYPAL'],
  trialMode: false,
  trialControlsEnabled: false,
  canCreateDonation: true,
};

const donation: PublicDonation = {
  id: '00000000-0000-4000-8000-000000000902',
  amount: '50.00',
  currency: 'USD',
  status: 'PENDING',
  gateway: 'PAYPAL',
  createdAt: '2026-08-11T10:00:00.000Z',
};

describe('DonationCheckout', () => {
  it('does not expose test payment controls outside confirmed trial mode', () => {
    render(
      <DonationCheckout
        capabilities={productionCapabilities}
        initialDonation={donation}
        language="en"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Confirm simulation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simulate failure' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('not available in this runtime');
  });
});
