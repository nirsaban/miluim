'use client';

import { ReactNode, useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { Footer } from './Footer';
import { useAuth, useIsAdmin, useIsFullAdmin } from '@/hooks/useAuth';
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
import {
  UserRole,
  isAdminMilitaryRole,
  LOGISTICS_ALLOWED_ADMIN_SECTIONS,
  LOGISTICS_ALLOWED_ADMIN_CONTENT_ITEMS,
} from '@/types';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  id?: string; // Used for filtering within sections
}

interface MenuSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

/**
 * Admin menu sections - full list
 * Access is filtered based on user role
 */
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
      { href: '/admin/status', label: 'בקשות יציאה', icon: UserCheck },
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
      { href: '/admin/messages', label: 'הודעות', icon: MessageSquare, id: 'messages' },
      { href: '/admin/notifications', label: 'התראות מערכת', icon: Bell, id: 'notifications' },
      { href: '/admin/operational', label: 'קישורים מבצעיים', icon: Link2, id: 'operational' },
      { href: '/admin/skills', label: 'כישורים', icon: Award, id: 'skills' },
    ],
  },
];

/**
 * Filter menu sections based on user role
 *
 * ADMIN (and admin-level MilitaryRoles): See all sections
 * LOGISTICS: See only 'service' and 'shifts' sections, and limited 'content' items
 * OFFICER: See only 'requests' section (department forms)
 */
function filterMenuSections(
  sections: MenuSection[],
  userRole: UserRole | undefined,
  isFullAdmin: boolean
): MenuSection[] {
  // Full admin sees everything
  if (isFullAdmin) {
    return sections;
  }

  // LOGISTICS sees limited sections
  if (userRole === 'LOGISTICS') {
    return sections
      .filter(section =>
        LOGISTICS_ALLOWED_ADMIN_SECTIONS.includes(section.id) ||
        section.id === 'content'
      )
      .map(section => {
        // Filter content section items for LOGISTICS
        if (section.id === 'content') {
          return {
            ...section,
            items: section.items.filter(item =>
              item.id && LOGISTICS_ALLOWED_ADMIN_CONTENT_ITEMS.includes(item.id)
            ),
          };
        }
        return section;
      })
      .filter(section => section.items.length > 0);
  }

  // OFFICER sees only requests section (for form management)
  if (userRole === 'OFFICER') {
    return sections.filter(section => section.id === 'requests');
  }

  // Default: no admin access
  return [];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isHydrated } = useAuth();
  const isAdmin = useIsAdmin();
  const isFullAdmin = useIsFullAdmin();

  // Filter menu sections based on user role
  const filteredSections = useMemo(() => {
    return filterMenuSections(adminMenuSections, user?.role, isFullAdmin);
  }, [user?.role, isFullAdmin]);

  // Find which section contains the active path
  const getActiveSectionId = () => {
    for (const section of filteredSections) {
      if (section.items.some((item) => pathname === item.href)) {
        return section.id;
      }
    }
    return filteredSections[0]?.id || '';
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="w-64 bg-white shadow-card hidden lg:block overflow-y-auto border-l border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-military-700 flex items-center gap-2">
              <div className="w-8 h-8 bg-military-100 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-military-600" />
              </div>
              פאנל ניהול
            </h2>
          </div>
          <nav className="p-2">
            {filteredSections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSections.includes(section.id);
              const hasActiveItem = section.items.some((item) => pathname === item.href);

              return (
                <div key={section.id} className="mb-1.5">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium',
                      hasActiveItem
                        ? 'bg-military-50 text-military-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                        hasActiveItem ? 'bg-military-100' : 'bg-gray-100'
                      )}>
                        <SectionIcon className="w-4 h-4" />
                      </div>
                      {section.label}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 transition-transform" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 transition-transform" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="mt-1.5 mr-5 space-y-1 border-r-2 border-gray-100 pr-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                                isActive
                                  ? 'bg-military-700 text-white shadow-sm'
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
          <div className="p-4 border-t border-gray-100 mt-auto">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-military-700 transition-colors text-sm px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <LayoutDashboard className="w-4 h-4" />
              חזרה לדף הראשי
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-4 bg-white rounded-2xl shadow-card p-3">
            {/* Section tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
              {filteredSections.map((section) => {
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
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-200 text-sm font-medium min-h-[44px]',
                      isExpanded
                        ? 'bg-military-700 text-white shadow-sm'
                        : hasActiveItem
                          ? 'bg-military-100 text-military-700'
                          : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    <SectionIcon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>
            {/* Sub-items for selected section */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {filteredSections
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
                          'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-200 text-sm min-h-[40px]',
                          isActive
                            ? 'bg-military-600 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
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
