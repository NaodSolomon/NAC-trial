import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminAuthGuard } from '@/features/auth';

export const metadata: Metadata = {
  title: { default: 'Administration | Nehemiah', template: '%s | Nehemiah Administration' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
