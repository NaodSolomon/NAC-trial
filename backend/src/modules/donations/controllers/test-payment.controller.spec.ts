import { trialPaymentRoutesEnabled } from './test-payment.controller';

describe('trialPaymentRoutesEnabled', () => {
  it('allows test and explicitly enabled non-production trials', () => {
    expect(trialPaymentRoutesEnabled('test', undefined)).toBe(true);
    expect(trialPaymentRoutesEnabled('development', 'true')).toBe(true);
  });

  it('never exposes simulation routes in production', () => {
    expect(trialPaymentRoutesEnabled('production', 'true')).toBe(false);
  });
});
