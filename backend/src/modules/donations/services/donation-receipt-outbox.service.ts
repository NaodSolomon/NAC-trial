import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { MAILER, Mailer } from '../../mail/mail.interface';
import {
  DONATION_RECEIPT_OUTBOX_REPOSITORY,
  DonationReceiptOutboxClaim,
  DonationReceiptOutboxRepository,
} from '../interfaces/donation-receipt-outbox-repository.interface';
import {
  DONATION_REPOSITORY,
  DonationRepository,
} from '../interfaces/donation-repository.interface';

export interface DonationReceiptOutboxRunResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
}

@Injectable()
export class DonationReceiptOutboxService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(DonationReceiptOutboxService.name);
  private timer?: NodeJS.Timeout;
  private activeTick?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    @Inject(DONATION_RECEIPT_OUTBOX_REPOSITORY)
    private readonly outbox: DonationReceiptOutboxRepository,
    @Inject(DONATION_REPOSITORY) private readonly donations: DonationRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<boolean>('mail.outboxWorkerEnabled')) return;

    const intervalMs = this.config.getOrThrow<number>('mail.outboxWorkerIntervalMs');
    this.startTick();
    this.timer = setInterval(() => this.startTick(), intervalMs);
    this.timer.unref();
    this.logger.log(`Donation receipt outbox worker enabled with a ${intervalMs} ms interval`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeTick;
  }

  async runOnce(now = new Date()): Promise<DonationReceiptOutboxRunResult> {
    const batchSize = this.config.getOrThrow<number>('mail.outboxWorkerBatchSize');
    const maxAttempts = this.config.getOrThrow<number>('mail.outboxWorkerMaxAttempts');
    const lockTimeoutMs = this.config.getOrThrow<number>('mail.outboxWorkerLockTimeoutMs');
    const claims = await this.outbox.claimBatch({
      batchSize,
      maxAttempts,
      now,
      staleBefore: new Date(now.getTime() - lockTimeoutMs),
      lockToken: randomUUID(),
    });
    const result: DonationReceiptOutboxRunResult = {
      claimed: claims.length,
      sent: 0,
      retried: 0,
      failed: 0,
    };

    for (const claim of claims) await this.deliver(claim, now, maxAttempts, result);
    return result;
  }

  private async deliver(
    claim: DonationReceiptOutboxClaim,
    now: Date,
    maxAttempts: number,
    result: DonationReceiptOutboxRunResult,
  ): Promise<void> {
    try {
      const donation = await this.donations.findById(claim.donationId);
      if (!donation || donation.status !== 'CONFIRMED' || !donation.receiptUrl) {
        await this.failClaim(claim, now, maxAttempts, result, 'INVALID_DONATION_RECEIPT', true);
        return;
      }

      await this.mailer.send({
        to: donation.donorEmail,
        subject: 'Your Nehemiah Autism Center donation receipt',
        text: [
          `Thank you, ${donation.donorName}.`,
          `Donation: ${donation.amount} ${donation.currency}.`,
          `Receipt: ${donation.receiptUrl}`,
        ].join('\n'),
        // A retry uses the same Message-ID so SMTP receivers can deduplicate it.
        messageId: `<donation-receipt-${claim.id}@nehemiah.local>`,
      });

      if (await this.outbox.markSent(claim.id, claim.lockToken, new Date())) {
        result.sent += 1;
      } else {
        this.logger.warn(`Receipt outbox claim ${claim.id} lost its delivery lock after SMTP send`);
      }
    } catch {
      await this.failClaim(claim, now, maxAttempts, result, 'MAIL_DELIVERY_FAILED');
    }
  }

  private async failClaim(
    claim: DonationReceiptOutboxClaim,
    now: Date,
    maxAttempts: number,
    result: DonationReceiptOutboxRunResult,
    errorCode: string,
    forceTerminal = false,
  ): Promise<void> {
    const terminal = forceTerminal || claim.attempts >= maxAttempts;
    const backoffMs = this.config.getOrThrow<number>('mail.outboxWorkerBackoffMs');
    const delayMs = backoffMs * 2 ** Math.max(0, claim.attempts - 1);
    const updated = await this.outbox.markFailed({
      id: claim.id,
      lockToken: claim.lockToken,
      terminal,
      nextAttemptAt: terminal ? now : new Date(now.getTime() + delayMs),
      errorCode,
      processedAt: new Date(),
    });
    if (!updated) {
      this.logger.warn(`Receipt outbox claim ${claim.id} lost its delivery lock after failure`);
      return;
    }
    if (terminal) result.failed += 1;
    else result.retried += 1;
  }

  private startTick(): void {
    if (this.activeTick) return;
    this.activeTick = this.runOnce()
      .then((result) => {
        if (result.claimed > 0) {
          this.logger.log(
            `Receipt outbox processed ${result.claimed} item(s): ${result.sent} sent, ${result.retried} retrying, ${result.failed} failed`,
          );
        }
      })
      .catch(() => this.logger.error('Donation receipt outbox tick failed'))
      .finally(() => {
        this.activeTick = undefined;
      });
  }
}
