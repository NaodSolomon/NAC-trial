'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Phone,
  MapPin,
  Clock,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronRight,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, SITE_CONFIG, type NavItem } from '@/lib/constants';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function CharityHeader() {
  const [isSticky, setIsSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleExpanded = useCallback((label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <header>
      {/* Tier 1: Top Bar */}
      <div className="hidden bg-topbar-bg text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="transition hover:text-primary">
              <Facebook className="size-4" />
            </a>
            <a href="#" aria-label="Twitter" className="transition hover:text-primary">
              <Twitter className="size-4" />
            </a>
            <a href="#" aria-label="Instagram" className="transition hover:text-primary">
              <Instagram className="size-4" />
            </a>
            <a href="#" aria-label="Youtube" className="transition hover:text-primary">
              <Youtube className="size-4" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="#" className="transition hover:text-primary">
              Email
            </a>
            <span className="text-white/40">|</span>
            <a href="#" className="transition hover:text-primary">
              Community
            </a>
            <span className="text-white/40">|</span>
            <a href="#" className="transition hover:text-primary">
              Support
            </a>
          </div>
        </div>
      </div>

      {/* Tier 2: Header Info */}
      <div className="border-b bg-white py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <Link href="/">
            <Image
              src="/images/logo.png"
              alt="Nehemiah"
              width={180}
              height={50}
              priority
            />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <InfoBox
              icon={<Phone className="size-5" />}
              heading="Get In Touch"
              content={SITE_CONFIG.email}
            />
            <InfoBox
              icon={<MapPin className="size-5" />}
              heading="Office Address"
              content={SITE_CONFIG.address}
            />
            <InfoBox
              icon={<Clock className="size-5" />}
              heading="Opening Hour"
              content={SITE_CONFIG.hours}
            />
          </div>
        </div>
      </div>

      {/* Tier 3: Navigation Bar */}
      <nav
        className={cn(
          'border-b bg-white transition-shadow duration-300',
          isSticky && 'fixed top-0 right-0 left-0 z-50 shadow-md',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          {/* Desktop Nav */}
          <ul className="hidden items-center lg:flex">
            {NAV_ITEMS.map((item) => (
              <DesktopNavItem key={item.label} item={item} />
            ))}
          </ul>

          {/* Donate Button (desktop) */}
          <Link
            href="/donate"
            className={cn(
              'hidden rounded bg-primary-hover px-6 py-2 text-sm font-semibold uppercase',
              'text-white transition hover:bg-primary-dark lg:inline-block',
            )}
          >
            Donate Now
          </Link>

          {/* Mobile Menu */}
          <div className="flex w-full items-center justify-between py-3 lg:hidden">
            <Link href="/">
              <Image src="/images/logo.png" alt="Nehemiah" width={120} height={34} />
            </Link>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button aria-label="Open menu" className="p-2">
                  <Menu className="size-6 text-text-dark" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-4">
                  <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => (
                      <MobileNavItem
                        key={item.label}
                        item={item}
                        expandedItems={expandedItems}
                        toggleExpanded={toggleExpanded}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    ))}
                  </ul>
                  <Link
                    href="/donate"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'mt-4 block rounded bg-primary-hover px-6 py-2 text-center text-sm',
                      'font-semibold uppercase text-white transition hover:bg-primary-dark',
                    )}
                  >
                    Donate Now
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Spacer when sticky to prevent content jump */}
      {isSticky && <div className="h-[57px]" />}
    </header>
  );
}

function InfoBox({
  icon,
  heading,
  content,
}: {
  icon: React.ReactNode;
  heading: string;
  content: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          'border-2 border-primary text-primary',
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-heading">{heading}</p>
        <p className="text-sm text-foreground">{content}</p>
      </div>
    </div>
  );
}

function DesktopNavItem({ item }: { item: NavItem }) {
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href ?? '#'}
          className={cn(
            'flex items-center px-3 py-4 text-sm font-semibold uppercase',
            'tracking-wide text-text-dark transition hover:text-primary',
          )}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="group relative">
      <Link
        href={item.href ?? '#'}
        className={cn(
          'flex items-center gap-1 px-3 py-4 text-sm font-semibold uppercase',
          'tracking-wide text-text-dark transition hover:text-primary',
        )}
      >
        {item.label}
        <ChevronDown className="size-3" />
      </Link>
      <ul
        className={cn(
          'invisible absolute top-full left-0 z-50 min-w-[200px] rounded-md',
          'bg-white py-2 opacity-0 shadow-lg transition-all duration-200',
          'group-hover:visible group-hover:opacity-100',
        )}
      >
        {item.children!.map((child) => (
          <DesktopDropdownItem key={child.label} item={child} />
        ))}
      </ul>
    </li>
  );
}

function DesktopDropdownItem({ item }: { item: NavItem }) {
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href ?? '#'}
          className={cn(
            'block px-4 py-2 text-sm text-foreground transition',
            'hover:bg-gray-50 hover:text-primary',
          )}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li className="group/nested relative">
      <span
        className={cn(
          'flex cursor-default items-center justify-between px-4 py-2 text-sm',
          'text-foreground transition hover:bg-gray-50 hover:text-primary',
        )}
      >
        {item.label}
        <ChevronRight className="size-3" />
      </span>
      <ul
        className={cn(
          'invisible absolute top-0 left-full z-50 min-w-[200px] rounded-md',
          'bg-white py-2 opacity-0 shadow-lg transition-all duration-200',
          'group-hover/nested:visible group-hover/nested:opacity-100',
        )}
      >
        {item.children!.map((child) => (
          <DesktopDropdownItem key={child.label} item={child} />
        ))}
      </ul>
    </li>
  );
}

function MobileNavItem({
  item,
  expandedItems,
  toggleExpanded,
  onNavigate,
  depth = 0,
}: {
  item: NavItem;
  expandedItems: Set<string>;
  toggleExpanded: (label: string) => void;
  onNavigate: () => void;
  depth?: number;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.label);

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href ?? '#'}
          onClick={onNavigate}
          className={cn(
            'block py-2 text-sm text-text-dark transition hover:text-primary',
            depth > 0 && 'pl-4',
          )}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => toggleExpanded(item.label)}
        className={cn(
          'flex w-full items-center justify-between py-2 text-sm',
          'font-semibold text-text-dark transition hover:text-primary',
          depth > 0 && 'pl-4',
        )}
      >
        {item.label}
        <ChevronDown
          className={cn('size-4 transition-transform duration-200', isExpanded && 'rotate-180')}
        />
      </button>
      {isExpanded && (
        <ul className="ml-2 border-l border-gray-200 pl-2">
          {item.children!.map((child) => (
            <MobileNavItem
              key={child.label}
              item={child}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
