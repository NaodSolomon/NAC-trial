'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { adminNavigation } from '@/lib/auth/permissions';

export function AdminBreadcrumbs({ pathname }: { pathname: string }) {
  const page = adminNavigation.find(
    ({ href }) => href === pathname || (href !== '/admin' && pathname.startsWith(`${href}/`)),
  );
  if (!page || page.href === '/admin') return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="text-foreground flex flex-wrap items-center gap-1 text-sm">
        <li>
          <Link href="/admin" className="hover:text-heading hover:underline">
            Dashboard
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-4" />
        </li>
        <li aria-current="page" className="text-heading font-medium">
          {page.label}
        </li>
      </ol>
    </nav>
  );
}

export function adminPageTitle(pathname: string): string {
  return (
    adminNavigation.find(
      ({ href }) => href === pathname || (href !== '/admin' && pathname.startsWith(`${href}/`)),
    )?.label ?? 'Administration'
  );
}
