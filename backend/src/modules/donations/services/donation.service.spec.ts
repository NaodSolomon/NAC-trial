import { ServiceUnavailableException } from '@nestjs/common';
import { DonationRepository } from '../interfaces/donation-repository.interface';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { ObjectStorage } from '../../media/interfaces/object-storage.interface';
import { DonationService } from './donation.service';
import { Mailer } from '../../mail/mail.interface';

describe('DonationService', () => {
  let repository: jest.Mocked<DonationRepository>;
  let gateway: jest.Mocked<PaymentGateway>;
  let storage: jest.Mocked<ObjectStorage>;
  let mailer: jest.Mocked<Mailer>;
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
    mailer = { send: jest.fn() };
    service = new DonationService(repository, gateway, storage, mailer);
  });

  it('treats repeated simulated confirmation as an idempotent delivery', async () => {
    const donation = {
      id: '239fc6d9-31f8-47fd-958d-c3a69b2c9ec7',
      donorName: 'Trial Donor',
      donorEmail: 'trial@example.com',
      message: null,
      amount: '25.00',
      currency: 'USD',
      gateway: 'PAYPAL',
      status: 'PENDING',
      providerOrderId: 'FAKE-ORDER',
      externalTransactionId: null,
      receiptUrl: null,
      confirmedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as const;
    repository.findById
      .mockResolvedValueOnce(donation)
      .mockResolvedValueOnce({ ...donation, status: 'CONFIRMED', confirmedAt: new Date() })
      .mockResolvedValueOnce({
        ...donation,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        receiptUrl: 'http://minio/receipt.pdf',
      })
      .mockResolvedValueOnce({
        ...donation,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        receiptUrl: 'http://minio/receipt.pdf',
      });
    repository.applyWebhook.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    storage.publicUrl.mockReturnValue('http://minio/receipt.pdf');

    await expect(service.simulate(donation.id, 'CONFIRMED')).resolves.toMatchObject({
      duplicate: false,
      status: 'CONFIRMED',
    });
    await expect(service.simulate(donation.id, 'CONFIRMED')).resolves.toMatchObject({
      duplicate: true,
    });
    expect(mailer.send).toHaveBeenCalledTimes(1);
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
