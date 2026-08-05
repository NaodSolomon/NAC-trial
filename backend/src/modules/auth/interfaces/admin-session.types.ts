export type AdminSessionFilterStatus = 'active' | 'revoked' | 'expired' | 'all';
export type AdminSessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface AdminSessionListCriteria {
  page: number;
  limit: number;
  offset: number;
  adminId?: string;
  status: AdminSessionFilterStatus;
}

export interface AdminSessionRecord {
  id: string;
  admin: {
    id: string;
    name: string;
    email: string;
  };
  userAgent: string | null;
  ipFingerprint: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  status: AdminSessionStatus;
}

export type SessionRevocationResult = 'revoked' | 'already_revoked' | 'not_found';
