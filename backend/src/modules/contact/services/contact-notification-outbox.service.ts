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
  CONTACT_NOTIFICATION_OUTBOX_REPOSITORY,
  ContactNotificationOutboxClaim,
  ContactNotificationOutboxRepository,
} from '../interfaces/contact-notification-outbox-repository.interface';
import { CONTACT_REPOSITORY, ContactRepository } from '../interfaces/contact-repository.interface';

export interface ContactNotificationOutboxRunResult {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
}

@Injectable()
export class ContactNotificationOutboxService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ContactNotificationOutboxService.name);
  private timer?: NodeJS.Timeout;
  private activeTick?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    @Inject(CONTACT_NOTIFICATION_OUTBOX_REPOSITORY)
    private readonly outbox: ContactNotificationOutboxRepository,
    @Inject(CONTACT_REPOSITORY) private readonly contacts: ContactRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.getOrThrow<boolean>('mail.outboxWorkerEnabled')) return;

    const intervalMs = this.config.getOrThrow<number>('mail.outboxWorkerIntervalMs');
    this.startTick();
    this.timer = setInterval(() => this.startTick(), intervalMs);
    this.timer.unref();
    this.logger.log(`Contact notification outbox worker enabled with a ${intervalMs} ms interval`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.activeTick;
  }

  async runOnce(now = new Date()): Promise<ContactNotificationOutboxRunResult> {
    const maxAttempts = this.config.getOrThrow<number>('mail.outboxWorkerMaxAttempts');
    const lockTimeoutMs = this.config.getOrThrow<number>('mail.outboxWorkerLockTimeoutMs');
    const claims = await this.outbox.claimBatch({
      batchSize: this.config.getOrThrow<number>('mail.outboxWorkerBatchSize'),
      maxAttempts,
      now,
      staleBefore: new Date(now.getTime() - lockTimeoutMs),
      lockToken: randomUUID(),
    });
    const result: ContactNotificationOutboxRunResult = {
      claimed: claims.length,
      sent: 0,
      retried: 0,
      failed: 0,
    };

    for (const claim of claims) await this.deliver(claim, now, maxAttempts, result);
    return result;
  }

  private async deliver(
    claim: ContactNotificationOutboxClaim,
    now: Date,
    maxAttempts: number,
    result: ContactNotificationOutboxRunResult,
  ): Promise<void> {
    try {
      const submission = await this.contacts.findById(claim.submissionId);
      if (!submission) {
        await this.failClaim(claim, now, maxAttempts, result, 'CONTACT_SUBMISSION_NOT_FOUND', true);
        return;
      }

      await this.mailer.send({
        to: this.config.getOrThrow<string>('mail.contactNotificationEmail'),
        subject: 'New Nehemiah Autism Center contact submission',
        text: [
          `Name: ${submission.name}`,
          `Email: ${submission.email}`,
          `Subject: ${submission.subject ?? '(not provided)'}`,
          `Language: ${submission.languageCode}`,
          `Submitted: ${submission.createdAt.toISOString()}`,
          '',
          submission.message,
        ].join('\n'),
        // Retries retain a stable identifier so SMTP receivers can deduplicate delivery.
        messageId: `<contact-submission-${claim.id}@nehemiah.local>`,
      });

      if (await this.outbox.markSent(claim.id, claim.lockToken, new Date())) {
        result.sent += 1;
      } else {
        this.logger.warn(`Contact outbox claim ${claim.id} lost its delivery lock after SMTP send`);
      }
    } catch {
      await this.failClaim(claim, now, maxAttempts, result, 'MAIL_DELIVERY_FAILED');
    }
  }

  private async failClaim(
    claim: ContactNotificationOutboxClaim,
    now: Date,
    maxAttempts: number,
    result: ContactNotificationOutboxRunResult,
    errorCode: string,
    forceTerminal = false,
  ): Promise<void> {
    const terminal = forceTerminal || claim.attempts >= maxAttempts;
    const delayMs =
      this.config.getOrThrow<number>('mail.outboxWorkerBackoffMs') *
      2 ** Math.max(0, claim.attempts - 1);
    const updated = await this.outbox.markFailed({
      id: claim.id,
      lockToken: claim.lockToken,
      terminal,
      nextAttemptAt: terminal ? now : new Date(now.getTime() + delayMs),
      errorCode,
      processedAt: new Date(),
    });
    if (!updated) {
      this.logger.warn(`Contact outbox claim ${claim.id} lost its delivery lock after failure`);
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
            `Contact outbox processed ${result.claimed} item(s): ${result.sent} sent, ${result.retried} retrying, ${result.failed} failed`,
          );
        }
      })
      .catch(() => this.logger.error('Contact notification outbox tick failed'))
      .finally(() => {
        this.activeTick = undefined;
      });
  }
}
