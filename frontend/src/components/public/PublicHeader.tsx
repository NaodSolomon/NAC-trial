'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Clock, Contrast, Mail, MapPin, Menu, Phone } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { usePublicShellData } from '@/hooks/use-public-shell-data';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandMark } from './BrandMark';
import type { PublicNavigationItem } from './public-shell.types';

export function PublicHeader() {
  const { language, href, t } = useLanguage();
  const { navigation, settings, navigationUnavailable } = usePublicShellData(language);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const synchronization = window.setTimeout(() => {
      setHighContrast(document.documentElement.dataset.contrast === 'more');
    }, 0);
    return () => window.clearTimeout(synchronization);
  }, []);

  const toggleContrast = () => {
    const enabled = !highContrast;
    setHighContrast(enabled);
    if (enabled) {
      document.documentElement.dataset.contrast = 'more';
      window.localStorage.setItem('nac-high-contrast', 'true');
    } else {
      delete document.documentElement.dataset.contrast;
      window.localStorage.removeItem('nac-high-contrast');
    }
  };

  return (
    <header className="relative z-40 bg-white" data-public-header>
      <div className="bg-topbar-bg hidden min-h-10 text-white md:block">
        <div className="mx-auto flex min-h-10 max-w-7xl items-center justify-between gap-4 px-4">
          {settings.contactEmail ? (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="hover:text-primary inline-flex min-h-10 items-center gap-2 text-sm"
            >
              <Mail aria-hidden="true" className="size-4" />
              {settings.contactEmail}
            </a>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 text-sm">
              <Mail aria-hidden="true" className="size-4" />
              {t('getInTouch')}
            </span>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleContrast}
              aria-pressed={highContrast}
              className="hover:text-primary inline-flex min-h-11 items-center gap-2 rounded px-2 text-sm font-semibold"
            >
              <Contrast aria-hidden="true" className="size-4" />
              {t('highContrast')}
            </button>
            <LanguageSwitcher supported={settings.supportedLanguages} />
          </div>
        </div>
      </div>

      <div className="hidden min-h-[82px] border-b bg-white md:block">
        <div className="mx-auto flex min-h-[82px] max-w-7xl items-center justify-between gap-6 px-4">
          <Link
            href={href('/')}
            className="shrink-0"
            aria-label={`${settings.siteName} — ${t('home')}`}
          >
            <BrandMark siteName={settings.siteName} />
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-5 lg:gap-8">
            <InfoBox icon={<Phone />} heading={t('getInTouch')} content={settings.phone} />
            <InfoBox icon={<MapPin />} heading={t('officeAddress')} content={settings.address} />
            <InfoBox icon={<Clock />} heading={t('openingHours')} content={t('localHours')} />
          </div>
        </div>
      </div>

      <nav aria-label={t('primaryNavigation')} className="min-h-[57px] border-b bg-white shadow-sm">
        <div className="mx-auto flex min-h-[57px] max-w-7xl items-center justify-between px-4">
          <ul className="hidden min-h-[57px] items-stretch lg:flex">
            {navigation.map((item) => (
              <DesktopNavigationItem key={item.id} item={item} localize={href} />
            ))}
          </ul>
          <Link
            href={href('/donate')}
            className="bg-primary-hover hover:bg-primary-dark hidden min-h-11 items-center rounded px-6 text-sm font-semibold text-white uppercase lg:inline-flex"
          >
            {t('donate')}
          </Link>

          <div className="flex min-h-[64px] w-full items-center justify-between gap-3 lg:hidden">
            <Link
              href={href('/')}
              className="shrink-0"
              aria-label={`${settings.siteName} — ${t('home')}`}
            >
              <BrandMark siteName={settings.siteName} compact />
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher supported={settings.supportedLanguages} />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('openMenu')}
                    className="text-text-dark hover:bg-secondary inline-flex size-11 items-center justify-center rounded"
                  >
                    <Menu aria-hidden="true" className="size-6" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[min(22rem,calc(100vw-1rem))] overflow-y-auto"
                >
                  <SheetHeader>
                    <SheetTitle>{t('menu')}</SheetTitle>
                  </SheetHeader>
                  <ul className="space-y-1 px-4" aria-label={t('primaryNavigation')}>
                    {navigation.map((item) => (
                      <MobileNavigationItem
                        key={item.id}
                        item={item}
                        localize={href}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    ))}
                  </ul>
                  <div className="px-4 pb-6">
                    <Link
                      href={href('/donate')}
                      onClick={() => setMobileOpen(false)}
                      className="bg-primary-hover hover:bg-primary-dark mt-4 flex min-h-11 items-center justify-center rounded px-6 text-center text-sm font-semibold text-white uppercase"
                    >
                      {t('donate')}
                    </Link>
                    <button
                      type="button"
                      onClick={toggleContrast}
                      aria-pressed={highContrast}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded border px-4 text-sm font-semibold"
                    >
                      <Contrast aria-hidden="true" className="size-4" />
                      {t('highContrast')}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
      {navigationUnavailable && (
        <p role="status" className="sr-only">
          {t('navigationFallback')}
        </p>
      )}
    </header>
  );
}

function InfoBox({
  icon,
  heading,
  content,
}: {
  icon: React.ReactElement;
  heading: string;
  content: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 lg:min-w-48">
      <span className="border-primary text-primary flex size-12 shrink-0 items-center justify-center rounded-full border-2 [&>svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="text-heading block text-sm font-semibold">{heading}</span>
        <span
          className="text-foreground block max-w-48 truncate text-sm"
          title={content ?? heading}
        >
          {content ?? heading}
        </span>
      </span>
    </div>
  );
}

function DesktopNavigationItem({
  item,
  localize,
}: {
  item: PublicNavigationItem;
  localize: (href: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const itemReference = useRef<HTMLLIElement>(null);
  const menuId = useId();
  const hasChildren = Boolean(item.children?.length);

  return (
    <li
      ref={itemReference}
      className="relative flex min-h-[57px] min-w-[6.5rem] items-stretch"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!itemReference.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <Link
        href={localize(item.url)}
        onFocus={() => setOpen(true)}
        className="text-text-dark hover:text-primary flex min-h-11 flex-1 items-center justify-center px-2 text-center text-sm font-semibold tracking-wide uppercase"
      >
        {item.label}
      </Link>
      {hasChildren && (
        <button
          type="button"
          aria-label={`${item.label} submenu`}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          className="text-text-dark hover:text-primary flex min-h-11 w-8 items-center justify-center"
        >
          <ChevronDown aria-hidden="true" className={cn('size-4', open && 'rotate-180')} />
        </button>
      )}
      {hasChildren && (
        <ul
          id={menuId}
          hidden={!open}
          className="absolute top-full left-0 z-50 min-w-56 rounded-b bg-white py-2 shadow-lg"
        >
          {item.children?.map((child) => (
            <li key={child.id}>
              <Link
                href={localize(child.url)}
                className="text-foreground hover:bg-secondary hover:text-primary flex min-h-11 items-center px-4 text-sm"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function MobileNavigationItem({
  item,
  localize,
  onNavigate,
}: {
  item: PublicNavigationItem;
  localize: (href: string) => string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const hasChildren = Boolean(item.children?.length);

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={localize(item.url)}
          onClick={onNavigate}
          className="text-text-dark hover:bg-secondary hover:text-primary flex min-h-11 flex-1 items-center rounded px-2 text-sm font-semibold"
        >
          {item.label}
        </Link>
        {hasChildren && (
          <button
            type="button"
            aria-label={`${item.label} submenu`}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((current) => !current)}
            className="hover:bg-secondary inline-flex size-11 items-center justify-center rounded"
          >
            <ChevronDown aria-hidden="true" className={cn('size-4', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul id={menuId} className="ml-3 border-l pl-3">
          {item.children?.map((child) => (
            <li key={child.id}>
              <Link
                href={localize(child.url)}
                onClick={onNavigate}
                className="text-text-dark hover:bg-secondary hover:text-primary flex min-h-11 items-center rounded px-2 text-sm"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
