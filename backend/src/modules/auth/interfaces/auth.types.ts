import { Admin } from '../../../database/schema';

export type AdminRole = Admin['role'];

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: AdminRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  fid: string;
  type: 'refresh';
}

export interface AdminPrincipal {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AuthenticationContext {
  ipAddress: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: Date;
}
