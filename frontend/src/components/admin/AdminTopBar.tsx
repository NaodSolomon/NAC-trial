'use client';

import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAdminRole } from '@/lib/auth/permissions';
import type { AdminPrincipal } from '@/lib/auth/constants';

export function AdminTopBar({
  user,
  pageTitle,
  loggingOut,
  onMenu,
  onLogout,
}: {
  user: AdminPrincipal;
  pageTitle: string;
  loggingOut: boolean;
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="bg-card sticky top-0 z-30 border-b shadow-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 min-w-11 p-2 lg:hidden"
            onClick={onMenu}
            aria-label="Open administrator navigation"
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
              Workspace
            </p>
            <p className="text-heading truncate font-semibold">{pageTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <span className="text-heading block text-sm font-semibold">{user.name}</span>
            <span className="text-foreground block text-xs">{formatAdminRole(user.role)}</span>
          </div>
          <span
            aria-hidden="true"
            className="bg-primary flex size-10 items-center justify-center rounded-full font-semibold text-white"
          >
            {user.name.trim().charAt(0).toUpperCase() || 'A'}
          </span>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={loggingOut}
            onClick={onLogout}
          >
            <LogOut aria-hidden="true" />
            <span className="hidden sm:inline">{loggingOut ? 'Logging out…' : 'Log out'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
