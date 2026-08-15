import { describe, expect, it } from 'vitest';
import { deriveDonationCapabilities } from './donation.capabilities';
import { donationFormSchema, isSafeCheckoutUrl } from './donation.schemas';
import type { RuntimeInformation } from './donation.types';

const trialRuntime: RuntimeInformation = {
  name: 'Nehemiah API',
  version: '1.0.0',
  environment: 'development',
  mode: 'trial',
  adapters: { storage: 'minio', mail: 'mailpit', payment: 'fake', cache: 'redis' },
  realPaymentsEnabled: false,
};

describe('donation runtime capabilities', () => {
  it('enables simulation controls only for an explicitly safe trial runtime', () => {
    const capabilities = deriveDonationCapabilities(trialRuntime, ['SIMULATED']);
    expect(capabilities).toMatchObject({
      trialMode: true,
      trialControlsEnabled: true,
      canCreateDonation: true,
    });

    const production = deriveDonationCapabilities({ ...trialRuntime, environment: 'production' }, [
      'PAYPAL',
    ]);
    expect(production.trialControlsEnabled).toBe(false);
    expect(production.canCreateDonation).toBe(false);
    expect(deriveDonationCapabilities(trialRuntime, ['PAYPAL']).canCreateDonation).toBe(false);
  });

  it('requires explicit real-payment configuration outside trial mode', () => {
    const production = deriveDonationCapabilities(
      {
        ...trialRuntime,
        environment: 'production',
        mode: 'production',
        adapters: { ...trialRuntime.adapters, payment: 'paypal' },
        realPaymentsEnabled: true,
      },
      ['PAYPAL'],
    );
    expect(production).toMatchObject({
      trialMode: false,
      trialControlsEnabled: false,
      canCreateDonation: true,
    });
    expect(deriveDonationCapabilities(trialRuntime, []).canCreateDonation).toBe(false);
  });
});

describe('donation input and checkout validation', () => {
  it('accepts only the public donation fields and strips unrelated payment data', () => {
    const result = donationFormSchema('en').parse({
      donorName: 'Test Donor',
      donorEmail: 'donor@example.org',
      amount: 25.5,
      currency: 'USD',
      message: 'For the demonstration',
      cardNumber: 'not-accepted',
      phone: 'not-accepted',
    });
    expect(result).toEqual({
      donorName: 'Test Donor',
      donorEmail: 'donor@example.org',
      amount: 25.5,
      currency: 'USD',
      message: 'For the demonstration',
    });
  });

  it('accepts only the matching same-origin trial checkout URL', () => {
    const id = '00000000-0000-4000-8000-000000000902';
    expect(
      isSafeCheckoutUrl(
        `http://localhost:3000/donate/simulated?donation=${id}`,
        true,
        id,
        'http://localhost:3000',
      ),
    ).toBe(true);
    expect(
      isSafeCheckoutUrl(
        `https://attacker.example/donate/simulated?donation=${id}`,
        true,
        id,
        'http://localhost:3000',
      ),
    ).toBe(false);
    expect(
      isSafeCheckoutUrl('http://payments.example/checkout', false, id, 'https://nehemiah.example'),
    ).toBe(false);
    expect(
      isSafeCheckoutUrl('https://payments.example/checkout', false, id, 'https://nehemiah.example'),
    ).toBe(true);
  });
});
