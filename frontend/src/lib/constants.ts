const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

if (process.env.NODE_ENV === 'production' && !configuredApiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is required in production');
}

export const API_URL = configuredApiUrl ?? 'http://localhost:8000/api/v1';

export interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/',
  },
  {
    label: 'About Us',
    href: '/about',
    children: [
      { label: 'About Us', href: '/about' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Volunteers', href: '/volunteer' },
      { label: 'FAQ', href: '/about#faq' },
    ],
  },
  {
    label: 'Events',
    href: '/events',
  },
  {
    label: 'Blog',
    href: '/blog',
  },
  { label: 'Contact', href: '/contact' },
];

export const SITE_CONFIG = {
  name: 'Nehemiah Autism Center',
};
