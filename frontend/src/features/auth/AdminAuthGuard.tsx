'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { browserApiClient } from '@/lib/api/browser-client';
import {
  canAccessAdminPath,
  clearLegacyBrowserStorage,
  authenticationExpiredEvent,
  isAdminPrincipal,
  refreshSession,
  type AdminPrincipal,
} from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const started = useRef(false);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const beginBootstrap = useAuthStore((state) => state.beginBootstrap);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  useEffect(() => {
    const expire = () => setAnonymous();
    window.addEventListener(authenticationExpiredEvent, expire);
    return () => window.removeEventListener(authenticationExpiredEvent, expire);
  }, [setAnonymous]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clearLegacyBrowserStorage();
    beginBootstrap();

    void (async () => {
      try {
        const session = await refreshSession();
        if (!session) {
          setAnonymous();
          return;
        }
        const principal = await browserApiClient.get<AdminPrincipal>('/auth/me');
        if (!isAdminPrincipal(principal)) throw new Error('Invalid administrator response');
        setAuthenticated(principal);
      } catch {
        setAnonymous();
      }
    })();
  }, [beginBootstrap, setAnonymous, setAuthenticated]);

  useEffect(() => {
    if (status === 'ANONYMOUS') {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === 'AUTHENTICATED' && user && !canAccessAdminPath(user.role, pathname)) {
      router.replace('/admin/forbidden');
    }
  }, [pathname, router, status, user]);

  if (status === 'BOOTSTRAPPING') {
    return (
      <div role="status" className="bg-secondary/30 flex min-h-screen items-center justify-center">
        <span className="bg-card rounded px-5 py-3 text-sm font-semibold shadow">
          Verifying secure session…
        </span>
      </div>
    );
  }
  if (status !== 'AUTHENTICATED' || !user || !canAccessAdminPath(user.role, pathname)) return null;
  return children;
}
