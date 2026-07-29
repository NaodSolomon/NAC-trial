import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret-change-me',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  issuer: process.env.JWT_ISSUER ?? 'nehemiah-api',
  audience: process.env.JWT_AUDIENCE ?? 'nehemiah-admin',
  ipHashSecret: process.env.IP_HASH_SECRET ?? 'development-ip-hash-secret-change-me',
}));
