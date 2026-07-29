export type AdminRole =
  | 'SUPER_ADMIN'
  | 'CONTENT_EDITOR'
  | 'FINANCE_VIEWER';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
