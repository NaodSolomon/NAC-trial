import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AdminPrincipal } from '../../auth/interfaces/auth.types';
import { OBJECT_STORAGE, ObjectStorage } from '../../media/interfaces/object-storage.interface';
import { CreateDonationDto, DonationQueryDto } from '../dto/donation.dto';
import {
  DONATION_REPOSITORY,
  DonationRepository,
} from '../interfaces/donation-repository.interface';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  PayPalWebhookHeaders,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class DonationService {
  constructor(
    @Inject(DONATION_REPOSITORY) private readonly donations: DonationRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paypal: PaymentGateway,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  gateways() {
    return this.paypal.isEnabled() ? ['PAYPAL'] : [];
  }

  async initiate(dto: CreateDonationDto) {
    if (!this.paypal.isEnabled()) throw new ServiceUnavailableException('PayPal is not configured');
    const donation = await this.donations.create({
      donorName: dto.donorName.trim(),
      donorEmail: dto.donorEmail.trim().toLowerCase(),
      message: dto.message?.trim() || null,
      amount: dto.amount.toFixed(2),
      currency: dto.currency,
      gateway: dto.gateway,
    });
    const checkout = await this.paypal.createCheckout(donation);
    await this.donations.attachOrder(donation.id, checkout.providerOrderId);
    return { donationId: donation.id, status: 'PENDING', paymentUrl: checkout.paymentUrl };
  }

  async publicStatus(id: string) {
    const row = await this.requireDonation(id);
    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      gateway: row.gateway,
      createdAt: row.createdAt,
    };
  }

  async cancel(id: string) {
    const row = await this.donations.cancel(id);
    if (!row) throw new NotFoundException('Cancellable donation was not found');
    return { status: row.status };
  }

  async recent() {
    return (await this.donations.recent(10)).map((row) => ({
      donorName: 'Anonymous',
      amount: row.amount,
      currency: row.currency,
      createdAt: row.createdAt,
    }));
  }

  list(query: DonationQueryDto) {
    return this.donations.list({
      page: query.page,
      limit: query.limit,
      offset: query.offset,
      sortOrder: query.sortOrder,
      status: query.status,
      currency: query.currency,
      gateway: query.gateway,
    });
  }

  requireDonation(id: string) {
    return this.donations.findById(id).then((row) => {
      if (!row) throw new NotFoundException(`Donation ${id} was not found`);
      return row;
    });
  }

  async verify(id: string, actor: AdminPrincipal) {
    const row = await this.donations.verify(id, actor.id);
    if (!row) throw new NotFoundException('Pending donation was not found');
    return { status: row.status };
  }

  stats() {
    return this.donations.stats();
  }

  async paypalWebhook(headers: PayPalWebhookHeaders, event: Record<string, unknown>) {
    const verified = await this.paypal.verifyWebhook(headers, event);
    if (verified.status && verified.providerOrderId && verified.eventId) {
      await this.donations.applyWebhook({
        eventId: verified.eventId,
        eventType: verified.eventType,
        providerOrderId: verified.providerOrderId,
        transactionId: verified.transactionId,
        status: verified.status,
      });
    }
    return { received: true };
  }

  async receipt(id: string) {
    const row = await this.requireDonation(id);
    if (row.status !== 'CONFIRMED') throw new NotFoundException('Confirmed donation was not found');
    if (row.receiptUrl) return { receiptUrl: row.receiptUrl };
    const buffer = await this.createReceiptPdf(row);
    const key = `receipts/${row.id}.pdf`;
    await this.storage.put({ objectKey: key, body: buffer, contentType: 'application/pdf' });
    const receiptUrl = this.storage.publicUrl(key);
    await this.donations.saveReceipt(row.id, receiptUrl);
    return { receiptUrl };
  }

  async resendReceipt(id: string, actor: AdminPrincipal) {
    const row = await this.requireDonation(id);
    if (row.status !== 'CONFIRMED') throw new NotFoundException('Confirmed donation was not found');
    await this.receipt(id);
    await this.donations.enqueueReceipt(id, actor.id);
    return { status: 'queued' };
  }

  async exportCsv(query: DonationQueryDto) {
    const result = await this.donations.list({
      page: 1,
      limit: 100,
      offset: 0,
      sortOrder: query.sortOrder,
      status: query.status,
      currency: query.currency,
      gateway: query.gateway,
    });
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [
      'id,amount,currency,status,gateway,donorName,donorEmail,createdAt',
      ...result.data.map((row) =>
        [
          row.id,
          row.amount,
          row.currency,
          row.status,
          row.gateway,
          row.donorName,
          row.donorEmail,
          row.createdAt.toISOString(),
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }

  private createReceiptPdf(
    row: Awaited<ReturnType<DonationService['requireDonation']>>,
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const document = new PDFDocument({ size: 'A4', margin: 60 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(22).text('Nehemiah Autism Center', { align: 'center' });
      document.moveDown().fontSize(16).text('Donation Receipt', { align: 'center' });
      document.moveDown(2).fontSize(11);
      document.text(`Receipt ID: ${row.id}`);
      document.text(`Donor: ${row.donorName}`);
      document.text(`Amount: ${row.amount} ${row.currency}`);
      document.text(`Gateway: ${row.gateway}`);
      document.text(`Confirmed: ${row.confirmedAt?.toISOString() ?? ''}`);
      document.moveDown(2).text('Thank you for supporting our mission.');
      document.end();
    });
  }
}
