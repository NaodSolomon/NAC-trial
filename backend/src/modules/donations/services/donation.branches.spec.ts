import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { DonationRepository } from '../interfaces/donation-repository.interface';
import { DonationService } from './donation.service';

const actor: AdminPrincipal = {
  id: '88888888-8888-4888-8888-888888888888',
  name: 'Super Administrator',
  email: 'super@example.org',
  role: 'SUPER_ADMIN',
};

function donationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    gateway: 'SIMULATED',
    providerOrderId: 'FAKE-order',
    status: 'PENDING',
    amount: '25.00',
    currency: 'USD',
    ...overrides,
  } as never;
}

describe('DonationService branch behaviour', () => {
  let donations: jest.Mocked<DonationRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let service: DonationService;

  let storage: { put: jest.Mock; delete: jest.Mock; publicUrl: jest.Mock };
  let mailer: { send: jest.Mock };

  beforeEach(() => {
    donations = {
      create: jest.fn(),
      attachOrder: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      stats: jest.fn(),
      verify: jest.fn(),
      cancel: jest.fn(),
      applyWebhook: jest.fn(),
    } as unknown as jest.Mocked<DonationRepository>;
    gateway = {
      gateway: 'SIMULATED',
      isEnabled: jest.fn().mockReturnValue(true),
      createCheckout: jest.fn(),
      verifyWebhook: jest.fn(),
    } as unknown as jest.Mocked<PaymentGateway>;
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn((key: string) => `https://storage.test/${key}`),
    };
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    service = new DonationService(
      donations,
      gateway,
      storage as never,
      mailer as never,
    );
  });

  describe('initiate', () => {
    it('refuses when no gateway is configured', async () => {
      gateway.isEnabled.mockReturnValue(false);

      await expect(service.initiate({ gateway: 'SIMULATED' } as never)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('refuses a gateway the configured provider does not serve', async () => {
      await expect(service.initiate({ gateway: 'PAYPAL' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(donations.create).not.toHaveBeenCalled();
    });

    it('normalises donor details and formats the amount', async () => {
      donations.create.mockResolvedValue(donationRow());
      gateway.createCheckout.mockResolvedValue({
        providerOrderId: 'FAKE-order',
        paymentUrl: 'http://localhost:3000/donate/simulated',
      });

      await service.initiate({
        gateway: 'SIMULATED',
        donorName: '  Donor  ',
        donorEmail: '  DONOR@Example.ORG ',
        message: '  Thank you  ',
        amount: 25,
        currency: 'USD',
      } as never);

      expect(donations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          donorName: 'Donor',
          donorEmail: 'donor@example.org',
          message: 'Thank you',
          amount: '25.00',
        }),
      );
    });

    it.each([
      ['an absent message', undefined],
      ['a blank message', '   '],
    ])('stores %s as null', async (_label, message) => {
      donations.create.mockResolvedValue(donationRow());
      gateway.createCheckout.mockResolvedValue({
        providerOrderId: 'FAKE-order',
        paymentUrl: 'http://localhost:3000/donate/simulated',
      });

      await service.initiate({
        gateway: 'SIMULATED',
        donorName: 'Donor',
        donorEmail: 'donor@example.org',
        message,
        amount: 10,
        currency: 'USD',
      } as never);

      expect(donations.create).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
    });
  });

  it('reports a donation that cannot be verified', async () => {
    donations.verify.mockResolvedValue(null as never);

    await expect(service.verify('id', actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the new status after verification', async () => {
    donations.verify.mockResolvedValue(donationRow({ status: 'CONFIRMED' }));

    await expect(service.verify('id', actor)).resolves.toEqual({ status: 'CONFIRMED' });
  });

  describe('simulate', () => {
    it('refuses a donation from a real provider', async () => {
      donations.findById.mockResolvedValue(donationRow({ gateway: 'PAYPAL' }));

      await expect(service.simulate('id', 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses a donation that never reached checkout', async () => {
      donations.findById.mockResolvedValue(donationRow({ providerOrderId: null }));

      await expect(service.simulate('id', 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to move a cancelled donation to a new outcome', async () => {
      donations.findById.mockResolvedValue(donationRow({ status: 'CANCELLED' }));

      await expect(service.simulate('id', 'CONFIRMED')).rejects.toBeInstanceOf(ConflictException);
    });

    it.each(['INITIATED', 'PENDING'])('accepts a %s donation for failure', async (status) => {
      donations.findById.mockResolvedValue(donationRow({ status }));
      donations.applyWebhook.mockResolvedValue(true as never);

      await expect(service.simulate('id', 'FAILED')).resolves.toMatchObject({
        status: 'FAILED',
        duplicate: false,
      });
    });

    it('labels a failed simulation with the failure event type and no receipt', async () => {
      donations.findById.mockResolvedValue(donationRow({ status: 'PENDING' }));
      donations.applyWebhook.mockResolvedValue(true as never);

      const result = await service.simulate('id', 'FAILED');

      expect(donations.applyWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FAKE.PAYMENT.FAILED', transactionId: null }),
      );
      expect(result.receiptUrl).toBeUndefined();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('reports a repeated failure as a duplicate', async () => {
      donations.findById.mockResolvedValue(donationRow({ status: 'FAILED' }));
      donations.applyWebhook.mockResolvedValue(false as never);

      await expect(service.simulate('id', 'FAILED')).resolves.toMatchObject({ duplicate: true });
    });

    it('emails a receipt once for a newly confirmed simulation', async () => {
      donations.findById
        .mockResolvedValueOnce(donationRow({ status: 'PENDING', donorEmail: 'donor@example.org' }))
        .mockResolvedValue(
          donationRow({ status: 'CONFIRMED', receiptUrl: 'https://storage.test/receipt.pdf' }),
        );
      donations.applyWebhook.mockResolvedValue(true as never);

      const result = await service.simulate('id', 'CONFIRMED');

      expect(donations.applyWebhook).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FAKE.PAYMENT.CONFIRMED' }),
      );
      expect(result.receiptUrl).toBe('https://storage.test/receipt.pdf');
      expect(mailer.send).toHaveBeenCalledTimes(1);
    });

    it('does not resend a receipt for a duplicate confirmation', async () => {
      donations.findById
        .mockResolvedValueOnce(donationRow({ status: 'CONFIRMED' }))
        .mockResolvedValue(
          donationRow({ status: 'CONFIRMED', receiptUrl: 'https://storage.test/receipt.pdf' }),
        );
      donations.applyWebhook.mockResolvedValue(false as never);

      await expect(service.simulate('id', 'CONFIRMED')).resolves.toMatchObject({ duplicate: true });
      expect(mailer.send).not.toHaveBeenCalled();
    });
  });

  it('reports a missing donation', async () => {
    donations.findById.mockResolvedValue(null as never);

    await expect(service.publicStatus('id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('advertises the configured gateway only while it is enabled', () => {
    expect(service.gateways()).toEqual(['SIMULATED']);

    gateway.isEnabled.mockReturnValue(false);
    expect(service.gateways()).toEqual([]);
  });
});
