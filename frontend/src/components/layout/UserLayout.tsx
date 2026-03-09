'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  FileText,
  Heart,
  Shield,
  User,
} from 'lucide-react';

interface UserLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard/home', label: 'בית', icon: Home },
  { href: '/dashboard/shifts', label: 'משמרות', icon: Calendar },
  { href: '/dashboard/friends', label: 'חברים', icon: Users },
  { href: '/dashboard/requests', label: 'טפסים', icon: FileText },
  { href: '/dashboard/social', label: 'חברתי', icon: Heart },
  { href: '/dashboard/operational', label: 'מבצעי', icon: Shield },
  { href: '/dashboard/profile', label: 'פרופיל', icon: User },
];

export function UserLayout({ children }: UserLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isHydrated } = useAuth();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || !isAuthenticated || !user) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* Main content with padding for bottom nav on mobile */}
      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:pb-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full transition-colors',
                  isActive
                    ? 'text-military-700'
                    : 'text-gray-500 hover:text-military-600'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-military-700')} />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
          {/* More menu for additional items */}
          <Link
            href="/dashboard/profile"
            className={cn(
              'flex flex-col items-center justify-center w-full h-full transition-colors',
              pathname === '/dashboard/profile' || pathname === '/dashboard/operational'
                ? 'text-military-700'
                : 'text-gray-500 hover:text-military-600'
            )}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-1">עוד</span>
          </Link>
        </div>
      </nav>

      {/* Side Navigation - Desktop */}
      <aside className="hidden lg:block fixed right-0 top-16 bottom-0 w-56 bg-white border-l border-gray-200 overflow-y-auto">
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-military-700 text-white'
                        : 'text-gray-700 hover:bg-military-50'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Desktop main content offset */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .container {
            margin-right: 14rem;
            max-width: calc(100% - 14rem);
          }
        }
      `}</style>
    </div>
  );
}
