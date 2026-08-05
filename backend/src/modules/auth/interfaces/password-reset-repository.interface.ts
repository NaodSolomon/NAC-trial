import {
  NewPasswordResetToken,
  PasswordResetToken,
} from '../../../database/schema/password-reset-token.schema';

export const PASSWORD_RESET_REPOSITORY = Symbol('PASSWORD_RESET_REPOSITORY');

export type PasswordResetConsumptionResult =
  | { status: 'consumed'; adminId: string; revokedSessionCount: number }
  | { status: 'invalid' };

export interface PasswordResetRepository {
  createResetToken(token: NewPasswordResetToken): Promise<PasswordResetToken>;
  consumeResetTokenAndChangePassword(
    tokenHash: string,
    passwordHash: string,
  ): Promise<PasswordResetConsumptionResult>;
  invalidateOutstandingTokens(adminId: string): Promise<void>;
  invalidateResetToken(tokenHash: string): Promise<void>;
}
