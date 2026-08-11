'use client';

import Link from 'next/link';
import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  CircleDollarSign,
  FileClock,
  FileText,
  Gauge,
  Images,
  ImagePlus,
  Library,
  Mail,
  MessageSquareText,
  MenuSquare,
  Search,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  MonitorSmartphone,
  HandHeart,
  Quote,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  navigationForRole,
  type AdminNavigationIcon,
  type AdminNavigationItem,
} from '@/lib/auth/permissions';
import type { AdminRole } from '@/lib/auth/constants';

const icons: Record<AdminNavigationIcon, typeof Gauge> = {
  dashboard: Gauge,
  content: FileText,
  blog: BookOpenText,
  events: CalendarDays,
  gallery: Images,
  media: ImagePlus,
  resources: Library,
  seo: Search,
  navigation: MenuSquare,
  contact: MessageSquareText,
  volunteers: HandHeart,
  testimonials: Quote,
  newsletter: Mail,
  donations: CircleDollarSign,
  analytics: BarChart3,
  administrators: Users,
  sessions: MonitorSmartphone,
  audit: FileClock,
  system: Settings,
  settings: SlidersHorizontal,
};

export function AdminSidebar({
  role,
  pathname,
  onNavigate,
}: {
  role: AdminRole;
  pathname: string;
  onNavigate?: () => void;
}) {
  const items = navigationForRole(role);
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex min-h-20 items-center gap-3 border-b border-white/10 px-5 font-semibold"
      >
        <span className="bg-primary rounded-lg p-2 text-white">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </span>
        <span>
          <span className="block">Nehemiah</span>
          <span className="block text-xs font-normal text-slate-400">Administration</span>
        </span>
      </Link>
      <nav aria-label="Administrator navigation" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <AdminNavigationLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs leading-5 text-slate-400">
        Navigation is limited by your assigned role. The API independently enforces every action.
      </div>
    </div>
  );
}

function AdminNavigationLink({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavigationItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = icons[item.icon];
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white',
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        {item.label}
      </Link>
    </li>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === '/admin'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
