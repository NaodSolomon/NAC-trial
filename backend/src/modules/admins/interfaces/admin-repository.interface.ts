import { Admin } from '../../../database/schema';

export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY');

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>;
  findByEmail(email: string): Promise<Admin | null>;
  recordFailedLogin(id: string): Promise<void>;
  recordSuccessfulLogin(id: string): Promise<void>;
}
