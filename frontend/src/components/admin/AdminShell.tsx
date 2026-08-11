'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { logoutAdministrator } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import { AdminBreadcrumbs, adminPageTitle } from './AdminBreadcrumbs';
import { AdminFeedbackProvider, useAdminFeedback } from './AdminFeedbackProvider';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminFeedbackProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminFeedbackProvider>
  );
}

function AdminShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const { notify } = useAdminFeedback();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutAdministrator();
    } catch {
      notify({
        tone: 'error',
        title: 'Remote logout could not be confirmed',
        message: 'The local session was cleared. Sign in again before continuing.',
      });
    } finally {
      setAnonymous();
      window.location.replace('/admin/login');
    }
  }

  return (
    <div className="bg-secondary/30 min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#admin-main-content"
        className="bg-primary fixed top-2 left-2 z-[100] -translate-y-20 rounded-md px-4 py-2 font-semibold text-white focus:translate-y-0"
      >
        Skip to administrator content
      </a>
      <aside className="hidden h-screen lg:sticky lg:top-0 lg:block">
        <AdminSidebar role={user.role} pathname={pathname} />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[18rem] max-w-[86vw] gap-0 border-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Administrator navigation</SheetTitle>
            <SheetDescription>Navigate to an administration section.</SheetDescription>
          </SheetHeader>
          <AdminSidebar
            role={user.role}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="min-w-0">
        <AdminTopBar
          user={user}
          pageTitle={adminPageTitle(pathname)}
          loggingOut={loggingOut}
          onMenu={() => setMenuOpen(true)}
          onLogout={() => void logout()}
        />
        <main id="admin-main-content" className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
          <AdminBreadcrumbs pathname={pathname} />
          {children}
        </main>
      </div>
    </div>
  );
}
