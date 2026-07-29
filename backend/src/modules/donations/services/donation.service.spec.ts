import { ServiceUnavailableException } from '@nestjs/common';
import { DonationRepository } from '../interfaces/donation-repository.interface';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { ObjectStorage } from '../../media/interfaces/object-storage.interface';
import { DonationService } from './donation.service';

describe('DonationService', () => {
  let repository: jest.Mocked<DonationRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let storage: jest.Mocked<ObjectStorage>;
  let service: DonationService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      attachOrder: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      recent: jest.fn(),
      cancel: jest.fn(),
      verify: jest.fn(),
      applyWebhook: jest.fn(),
      stats: jest.fn(),
      saveReceipt: jest.fn(),
      enqueueReceipt: jest.fn(),
    };
    gateway = {
      isEnabled: jest.fn().mockReturnValue(false),
      createCheckout: jest.fn(),
      verifyWebhook: jest.fn(),
    };
    storage = {
      put: jest.fn(),
      delete: jest.fn(),
      publicUrl: jest.fn(),
    };
    service = new DonationService(repository, gateway, storage);
  });

  it('fails closed before persisting when PayPal is disabled', async () => {
    await expect(
      service.initiate({
        amount: 50,
        currency: 'USD',
        gateway: 'PAYPAL',
        donorName: 'Jane Doe',
        donorEmail: 'jane@example.com',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('never exposes donor identity in recent public donations', async () => {
    repository.recent.mockResolvedValue([
      {
        id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
        donorName: 'Private Donor',
        donorEmail: 'private@example.com',
        message: null,
        amount: '50.00',
        currency: 'USD',
        gateway: 'PAYPAL',
        status: 'CONFIRMED',
        providerOrderId: 'ORDER',
        externalTransactionId: 'CAPTURE',
        receiptUrl: null,
        confirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(service.recent()).resolves.toEqual([
      expect.objectContaining({ donorName: 'Anonymous', amount: '50.00' }),
    ]);
  });
});
