import type { Metadata } from 'next';
import { Open_Sans, Trirong } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import {
  defaultLanguage,
  documentLanguageHeaderName,
  normalizeLanguage,
} from '@/lib/i18n';
import { defaultDescription, getSiteUrl, siteName } from '@/lib/seo/site';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const trirong = Trirong({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: siteName, template: `%s | ${siteName}` },
  description: defaultDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const documentLanguage =
    normalizeLanguage(requestHeaders.get(documentLanguageHeaderName)) ?? defaultLanguage;

  return (
    <html lang={documentLanguage} suppressHydrationWarning>
      <body className={`${openSans.variable} ${trirong.variable} ${openSans.className}`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
