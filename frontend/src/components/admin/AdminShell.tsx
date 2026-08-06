'use client';

import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutAdministrator } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  const logout = async () => {
    await logoutAdministrator().catch(() => undefined);
    window.location.replace('/admin/login');
  };

  return (
    <div className="bg-secondary/30 min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="text-heading flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden="true" className="text-primary size-5" />
            NAC administration
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right text-sm sm:block">
              <span className="text-heading block font-semibold">{user?.name}</span>
              <span className="text-foreground block text-xs">{formatRole(user?.role)}</span>
            </span>
            <Button type="button" variant="outline" className="min-h-11" onClick={logout}>
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

function formatRole(role: string | undefined): string {
  return role ? role.toLowerCase().replaceAll('_', ' ') : '';
}
