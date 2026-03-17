'use client';

import { ReactNode, useEffect, useState } from 'react';
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
  UserPlus,
  Upload,
  ChevronDown,
  ChevronLeft,
  Settings,
  LucideIcon,
  Shield,
  CalendarCheck,
  BarChart3,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

const adminMenuSections: MenuSection[] = [
  {
    id: 'service',
    label: 'סבב מילואים',
    icon: Shield,
    items: [
      { href: '/admin/current-service', label: 'דשבורד נוכחי', icon: LayoutDashboard },
      { href: '/admin/current-service/checklist', label: 'צ׳קליסט', icon: ClipboardList },
      { href: '/admin/service-cycles', label: 'ניהול סבבים', icon: CalendarCheck },
    ],
  },
  {
    id: 'users',
    label: 'משתמשים',
    icon: Users,
    items: [
      { href: '/admin/preapproved-users', label: 'הוספת משתמשים', icon: UserPlus },
      { href: '/admin/csv-import', label: 'ייבוא מ-CSV', icon: Upload },
      { href: '/admin/soldiers', label: 'ניהול לוחמים', icon: Users },
      { href: '/admin/status', label: 'סטטוס לוחמים', icon: UserCheck },
    ],
  },
  {
    id: 'requests',
    label: 'בקשות',
    icon: FileText,
    items: [
      { href: '/admin/forms', label: 'טפסים ובקשות', icon: FileText },
      { href: '/admin/leave-categories', label: 'קטגוריות יציאה', icon: Tags },
    ],
  },
  {
    id: 'shifts',
    label: 'משמרות',
    icon: Calendar,
    items: [
      { href: '/admin/shifts', label: 'סידור משמרות', icon: Calendar },
      { href: '/admin/shift-templates', label: 'תבניות משמרות', icon: Clock },
      { href: '/admin/shift-assignments', label: 'שיבוץ משמרות', icon: UserCheck },
      { href: '/admin/workloads', label: 'עומסי עבודה', icon: BarChart3 },
      { href: '/admin/tasks', label: 'משימות', icon: ClipboardList },
      { href: '/admin/zones', label: 'אזורים', icon: Map },
    ],
  },
  {
    id: 'content',
    label: 'ניהול תוכן',
    icon: Settings,
    items: [
      { href: '/admin/messages', label: 'הודעות', icon: MessageSquare },
      { href: '/admin/notifications', label: 'התראות מערכת', icon: Bell },
      { href: '/admin/operational', label: 'קישורים מבצעיים', icon: Link2 },
      { href: '/admin/skills', label: 'כישורים', icon: Award },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isHydrated } = useAuth();
  const isAdmin = useIsAdmin();

  // Find which section contains the active path
  const getActiveSectionId = () => {
    for (const section of adminMenuSections) {
      if (section.items.some((item) => pathname === item.href)) {
        return section.id;
      }
    }
    return adminMenuSections[0]?.id || '';
  };

  const [expandedSections, setExpandedSections] = useState<string[]>([getActiveSectionId()]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isHydrated && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAdmin, isHydrated, router]);

  // Expand section when navigating to a new page
  useEffect(() => {
    const activeSectionId = getActiveSectionId();
    if (activeSectionId && !expandedSections.includes(activeSectionId)) {
      setExpandedSections((prev) => [...prev, activeSectionId]);
    }
  }, [pathname]);

  // Show loader while hydrating or not authenticated
  if (!isHydrated || !isAuthenticated || !user || !isAdmin) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white shadow-md hidden lg:block overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-bold text-military-700 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              פאנל ניהול
            </h2>
          </div>
          <nav className="p-2">
            {adminMenuSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.id);
              const hasActiveItem = section.items.some((item) => pathname === item.href);

              return (
                <div key={section.id} className="mb-1">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                      hasActiveItem
                        ? 'bg-military-50 text-military-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="w-5 h-5" />
                      {section.label}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="mt-1 mr-4 space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
                                isActive
                                  ? 'bg-military-700 text-white'
                                  : 'text-gray-600 hover:bg-military-50 hover:text-military-700'
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="p-4 border-t mt-auto">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-military-700 transition-colors text-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              חזרה לדף הראשי
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto">
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-4">
            {/* Section tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {adminMenuSections.map((section) => {
                const SectionIcon = section.icon;
                const hasActiveItem = section.items.some((item) => pathname === item.href);
                const isExpanded = expandedSections.includes(section.id);

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      // On mobile, only show one section at a time
                      setExpandedSections([section.id]);
                    }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors',
                      isExpanded
                        ? 'bg-military-700 text-white'
                        : hasActiveItem
                          ? 'bg-military-100 text-military-700'
                          : 'bg-white text-gray-700'
                    )}
                  >
                    <SectionIcon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            {/* Sub-items for selected section */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {adminMenuSections
                .filter((section) => expandedSections.includes(section.id))
                .flatMap((section) =>
                  section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors text-sm',
                          isActive
                            ? 'bg-military-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {item.label}
                      </Link>
                    );
                  })
                )}
            </div>
          </div>
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
