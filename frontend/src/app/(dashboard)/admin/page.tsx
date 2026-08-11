'use client';

import { DashboardCards } from '@/features/dashboard';
import { formatAdminRole } from '@/lib/auth/permissions';
import { useAuthStore } from '@/store/auth.store';

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return (
    <section aria-labelledby="dashboard-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        {formatAdminRole(user.role)} workspace
      </p>
      <h1
        id="dashboard-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Welcome back, {user.name}
      </h1>
      <p className="text-foreground mt-3 mb-8 max-w-2xl">
        This summary uses only the administrative APIs available to your assigned role.
      </p>
      <DashboardCards role={user.role} />
    </section>
  );
}
