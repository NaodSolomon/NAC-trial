import { AdminShell } from '@/components/admin/AdminShell';
import { AdminAuthGuard } from '@/features/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
