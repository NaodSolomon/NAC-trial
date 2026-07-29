import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../../modules/auth/interfaces/auth.types';

export const ROLES_KEY = 'required_admin_roles';

export const Roles = (...roles: AdminRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
