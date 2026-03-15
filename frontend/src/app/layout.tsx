import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const rubik = Rubik({ subsets: ['latin', 'hebrew'] });

export const metadata: Metadata = {
  title: 'מערכת ניהול פלוגת יוגב',
  description: 'מערכת תפעול פלוגתית - פלוגת יוגב',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'יוגב',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${rubik.className} bg-gray-100 min-h-screen`}>
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
