'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Calendar,
  FileText,
  Users,
  LayoutDashboard,
  Link2,
  Bell,
  Tags,
  Award,
  Map,
  ClipboardList,
  Clock,
  UserCheck,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminMenuItems = [
  { href: '/admin/messages', label: 'הודעות', icon: MessageSquare },
  { href: '/admin/notifications', label: 'התראות מערכת', icon: Bell },
  { href: '/admin/shifts', label: 'סידור משמרות', icon: Calendar },
  { href: '/admin/forms', label: 'טפסים', icon: FileText },
  { href: '/admin/status', label: 'סטטוס חיילים', icon: Users },
  { href: '/admin/leave-categories', label: 'קטגוריות יציאה', icon: Tags },
  { href: '/admin/operational', label: 'קישורים מבצעיים', icon: Link2 },
  { href: '/admin/soldiers', label: 'ניהול חיילים', icon: Users },
  { href: '/admin/skills', label: 'כישורים', icon: Award },
  { href: '/admin/zones', label: 'אזורים', icon: Map },
  { href: '/admin/tasks', label: 'משימות', icon: ClipboardList },
  { href: '/admin/shift-templates', label: 'תבניות משמרות', icon: Clock },
  { href: '/admin/shift-assignments', label: 'שיבוץ משמרות', icon: UserCheck },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isHydrated } = useAuth();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isHydrated && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, isHydrated, router]);

  // Show loader while hydrating or not authenticated
  if (!isHydrated || !isAuthenticated || !user || !isAdmin) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex">
        <aside className="w-64 bg-white shadow-md hidden lg:block">
          <div className="p-4 border-b">
            <h2 className="font-bold text-military-700 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              פאנל ניהול
            </h2>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
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
          <div className="p-4 border-t">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-military-700 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              חזרה לדף הראשי
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto">
          <div className="lg:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-military-700 text-white'
                        : 'bg-white text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
