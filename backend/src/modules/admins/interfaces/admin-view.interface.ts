import { Admin } from '../../../database/schema';

export type AdminView = Omit<Admin, 'passwordHash' | 'failedLoginAttempts' | 'lockedUntil'>;
