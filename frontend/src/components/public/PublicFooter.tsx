'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPinned,
  Phone,
  Youtube,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { usePublicShellData } from '@/hooks/use-public-shell-data';
import type { PublicSiteSettings } from './public-shell.types';

export function PublicFooter() {
  const { language, href, t } = useLanguage();
  const { navigation, settings } = usePublicShellData(language);
  const supportLinks = [
    { label: t('volunteers'), url: '/volunteer' },
    { label: t('faq'), url: '/faq' },
    { label: t('events'), url: '/events' },
  ];
  const discoveryLinks = [
    { label: t('gallery'), url: '/gallery' },
    { label: t('blog'), url: '/blog' },
    { label: t('donate'), url: '/donate' },
  ];

  return (
    <footer className="bg-footer-bg text-footer-text">
      <div className="relative min-h-[28rem] overflow-hidden">
        <Image
          src="/images/footer_bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-10"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <nav
            aria-label={t('footerNavigation')}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            <FooterColumn
              title={t('organization')}
              links={navigation.slice(0, 5)}
              localize={href}
            />
            <FooterColumn title={t('support')} links={supportLinks} localize={href} />
            <FooterColumn title={t('discover')} links={discoveryLinks} localize={href} />
            <section className="min-h-40">
              <h2 className="mb-4 font-serif text-lg text-white">{t('about')}</h2>
              <p className="max-w-sm text-sm leading-relaxed">{t('footerAbout')}</p>
            </section>
          </nav>

          <address className="mt-10 grid min-h-24 grid-cols-1 gap-5 border-t border-white/20 pt-8 not-italic sm:grid-cols-2 lg:grid-cols-3">
            <ContactItem icon={<MapPinned />} value={settings.address} />
            <ContactItem
              icon={<Mail />}
              value={settings.contactEmail}
              href={settings.contactEmail ? `mailto:${settings.contactEmail}` : undefined}
            />
            <ContactItem
              icon={<Phone />}
              value={settings.phone}
              href={settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, '')}` : undefined}
            />
          </address>
          <SocialLinks links={settings.socialLinks} />
        </div>
      </div>
      <div className="border-t border-white/15 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm">
          &copy; {new Date().getFullYear()} {settings.siteName}. {t('allRightsReserved')}
        </div>
      </div>
    </footer>
  );
}

function SocialLinks({ links }: { links: PublicSiteSettings['socialLinks'] }) {
  const networks = [
    ['facebook', Facebook],
    ['instagram', Instagram],
    ['youtube', Youtube],
    ['linkedin', Linkedin],
  ] as const;
  const active = networks.filter(([network]) => links[network]);
  if (!active.length) return null;
  return (
    <nav aria-label="Social media" className="mt-6 flex flex-wrap gap-2">
      {active.map(([network, Icon]) => (
        <a
          key={network}
          href={links[network]}
          target="_blank"
          rel="noreferrer"
          aria-label={`${network} (opens in a new tab)`}
          className="hover:bg-primary flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/30"
        >
          <Icon aria-hidden="true" className="size-5" />
        </a>
      ))}
    </nav>
  );
}

function FooterColumn({
  title,
  links,
  localize,
}: {
  title: string;
  links: Array<{ id?: string; label: string; url: string }>;
  localize: (href: string) => string;
}) {
  return (
    <section className="min-h-40">
      <h2 className="mb-4 font-serif text-lg text-white">{title}</h2>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.id ?? `${link.label}-${link.url}`}>
            <Link
              href={localize(link.url)}
              className="hover:text-primary flex min-h-10 items-center gap-2 rounded text-sm"
            >
              <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactItem({
  icon,
  value,
  href,
}: {
  icon: React.ReactElement;
  value: string | null;
  href?: string;
}) {
  if (!value) return <span aria-hidden="true" />;
  const content = (
    <>
      <span className="text-primary mt-0.5 [&>svg]:size-5">{icon}</span>
      <span className="text-sm">{value}</span>
    </>
  );
  return href ? (
    <a href={href} className="hover:text-primary flex min-h-11 items-start gap-3 rounded">
      {content}
    </a>
  ) : (
    <span className="flex min-h-11 items-start gap-3">{content}</span>
  );
}
