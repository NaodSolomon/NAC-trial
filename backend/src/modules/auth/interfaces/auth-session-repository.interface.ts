import { AuthSession, NewAuthSession } from '../../../database/schema/auth-session.schema';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface AuthSessionRepository {
  create(session: NewAuthSession): Promise<AuthSession>;
  findById(id: string): Promise<AuthSession | null>;
  rotate(currentSessionId: string, replacement: NewAuthSession): Promise<AuthSession | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeFamily(tokenFamilyId: string): Promise<void>;
}
