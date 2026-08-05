import { AuthSession, NewAuthSession } from '../../../database/schema/auth-session.schema';
import { PaginatedResult } from '../../../common/types/api-response.type';
import {
  AdminSessionListCriteria,
  AdminSessionRecord,
  SessionRevocationResult,
} from './admin-session.types';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface AuthSessionRepository {
  create(session: NewAuthSession): Promise<AuthSession>;
  findById(id: string): Promise<AuthSession | null>;
  rotate(currentSessionId: string, replacement: NewAuthSession): Promise<AuthSession | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeFamily(tokenFamilyId: string): Promise<void>;
  list(criteria: AdminSessionListCriteria): Promise<PaginatedResult<AdminSessionRecord>>;
  revokeSession(sessionId: string, actorId: string): Promise<SessionRevocationResult>;
  revokeAllForAdmin(adminId: string, actorId: string): Promise<number>;
}
