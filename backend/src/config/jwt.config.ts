import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  accessTokenExpiry: process.env.JWT_EXPIRY ?? '15m',
}));
