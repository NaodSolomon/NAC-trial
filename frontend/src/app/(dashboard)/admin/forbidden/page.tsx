import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';

export default function ForbiddenAdminPage() {
  return (
    <AdminAccessDenied description="Ask a super administrator if your responsibilities have changed." />
  );
}
