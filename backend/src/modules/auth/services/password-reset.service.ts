import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import {
  ADMIN_REPOSITORY,
  AdminRepository,
} from '../../admins/interfaces/admin-repository.interface';
import { PasswordResetMailerService } from '../../mail/password-reset-mailer.service';
import { PasswordResetConfirmDto } from '../dto/password-reset.dto';
import {
  PASSWORD_RESET_REPOSITORY,
  PasswordResetRepository,
} from '../interfaces/password-reset-repository.interface';

const REQUEST_RESPONSE = {
  message: 'If the account exists, password reset instructions have been sent.',
};
const INVALID_TOKEN_MESSAGE = 'Password reset token is invalid or expired';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(ADMIN_REPOSITORY)
    private readonly admins: AdminRepository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly resets: PasswordResetRepository,
    private readonly resetMailer: PasswordResetMailerService,
    private readonly config: ConfigService,
  ) {}

  async request(emailInput: string): Promise<{ message: string }> {
    const email = emailInput.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const admin = await this.admins.findByEmail(email);

    if (!admin?.isActive) {
      return { ...REQUEST_RESPONSE };
    }

    const ttlMinutes = this.config.getOrThrow<number>('mail.passwordResetTtlMinutes');
    await this.resets.createResetToken({
      adminId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    });

    try {
      await this.resetMailer.send(admin.email, rawToken);
    } catch {
      await this.resets.invalidateResetToken(tokenHash);
      this.logger.warn('Password reset email delivery failed; issued token was invalidated');
    }

    return { ...REQUEST_RESPONSE };
  }

  async confirm(dto: PasswordResetConfirmDto): Promise<{ message: string }> {
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const result = await this.resets.consumeResetTokenAndChangePassword(
      this.hashToken(dto.token),
      passwordHash,
    );

    if (result.status === 'invalid') {
      throw new BadRequestException(INVALID_TOKEN_MESSAGE);
    }

    return { message: 'Password has been reset successfully.' };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
