import type { Metadata } from 'next';
import { Open_Sans, Trirong } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const trirong = Trirong({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nehemiah Autism Center',
  description:
    'Nehemiah Autism Center supports autistic children and their families in Ethiopia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openSans.variable} ${trirong.variable} ${openSans.className}`}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
