'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth, useIsBattalionAdmin, useIsSystemTech } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  LucideIcon,
} from 'lucide-react';

interface BattalionLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/battalion', label: 'סקירה כללית', icon: LayoutDashboard },
  { href: '/battalion/companies', label: 'ניהול פלוגות', icon: Building2 },
  { href: '/battalion/manpower', label: 'כח אדם', icon: Users },
  { href: '/battalion/attendance', label: 'נוכחות', icon: ClipboardList },
  { href: '/battalion/leaves', label: 'יציאות', icon: FileText },
];

export function BattalionLayout({ children }: BattalionLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuth();
  const isBattalionAdmin = useIsBattalionAdmin();
  const isSystemTech = useIsSystemTech();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!isBattalionAdmin && !isSystemTech) {
      router.push('/dashboard/home');
      return;
    }

    setIsReady(true);
  }, [isHydrated, user, isBattalionAdmin, isSystemTech, router]);

  if (!isReady) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <Header />
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 bg-white border-l border-gray-200 flex-col py-4">
          <div className="px-4 mb-4">
            <h2 className="text-lg font-bold text-military-700">ניהול גדוד</h2>
            <p className="text-sm text-gray-500">סקירה חוצת פלוגות</p>
          </div>
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/battalion' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-military-100 text-military-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40">
          <nav className="flex justify-around py-2">
            {navItems.slice(0, 5).map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/battalion' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-1 text-xs',
                    isActive ? 'text-military-700 font-medium' : 'text-gray-500'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
