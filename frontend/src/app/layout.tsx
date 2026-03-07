import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const rubik = Rubik({ subsets: ['latin', 'hebrew'] });

export const metadata: Metadata = {
  title: 'מערכת ניהול פלוגת יוגב',
  description: 'מערכת תפעול פלוגתית - פלוגת יוגב',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} bg-gray-100 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
