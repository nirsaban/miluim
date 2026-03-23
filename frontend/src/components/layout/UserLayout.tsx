'use client';

import { ReactNode, useEffect, useState } from 'react';
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
  ClipboardCheck,
  Building2,
  UserCheck,
  BarChart3,
  ChevronDown,
  Settings,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { UserRole } from '@/types';

interface UserLayoutProps {
  children: ReactNode;
}

// ============================================
// Navigation Types
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  roles?: UserRole[]; // Section-level role restriction
}

// ============================================
// Navigation Configuration
// ============================================

const navSections: NavSection[] = [
  {
    id: 'main',
    label: 'ראשי',
    icon: Home,
    items: [
      { href: '/dashboard/home', label: 'בית', icon: Home },
    ],
  },
  {
    id: 'service',
    label: 'שירות',
    icon: Shield,
    items: [
      { href: '/dashboard/current-service', label: 'מילואים נוכחיים', icon: ClipboardCheck },
      { href: '/dashboard/operational', label: 'מידע מבצעי', icon: Shield },
    ],
  },
  {
    id: 'scheduling',
    label: 'לו״ז',
    icon: Calendar,
    items: [
      { href: '/dashboard/shifts', label: 'משמרות', icon: Calendar },
      { href: '/dashboard/workloads', label: 'עומסים', icon: BarChart3 },
    ],
  },
  {
    id: 'management',
    label: 'ניהול',
    icon: Settings,
    roles: ['OFFICER', 'LOGISTICS', 'ADMIN'],
    items: [
      { href: '/dashboard/shift-duty', label: 'ניהול משמרת', icon: UserCheck, roles: ['OFFICER', 'LOGISTICS', 'ADMIN'] },
      { href: '/dashboard/department', label: 'מחלקה', icon: Building2, roles: ['OFFICER', 'ADMIN'] },
    ],
  },
  {
    id: 'community',
    label: 'חברי הפלוגה',
    icon: Users,
    items: [
      { href: '/dashboard/friends', label: 'חברים', icon: Users },
      { href: '/dashboard/social', label: 'פעילות חברתית', icon: Heart },
    ],
  },
  {
    id: 'personal',
    label: 'אישי',
    icon: User,
    items: [
      { href: '/dashboard/requests', label: 'בקשות וטפסים', icon: FileText },
      { href: '/dashboard/profile', label: 'פרופיל', icon: User },
    ],
  },
];

// Mobile bottom nav: Primary items shown directly, rest in "More" menu
const mobileNavConfig = {
  primaryItems: [
    { href: '/dashboard/home', label: 'בית', icon: Home },
    { href: '/dashboard/shifts', label: 'משמרות', icon: Calendar },
    { href: '/dashboard/requests', label: 'בקשות וטפסים', icon: Users },
    { href: '/dashboard/profile', label: 'פרופיל', icon: User },
  ],
  moreMenuLabel: 'עוד',
};

// ============================================
// Helper Functions
// ============================================

function filterNavSections(sections: NavSection[], userRole: UserRole): NavSection[] {
  return sections
    .filter((section) => {
      if (!section.roles) return true;
      return section.roles.includes(userRole);
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

function getAllNavItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

function isPathInSection(pathname: string, section: NavSection): boolean {
  return section.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
}

// ============================================
// Desktop Sidebar Section Component
// ============================================

interface DesktopNavSectionProps {
  section: NavSection;
  pathname: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function DesktopNavSection({ section, pathname, isExpanded, onToggle }: DesktopNavSectionProps) {
  const isActive = isPathInSection(pathname, section);
  const SectionIcon = section.icon;

  // For single-item sections, render as direct link
  if (section.items.length === 1) {
    const item = section.items[0];
    const Icon = item.icon;
    const isItemActive = pathname === item.href || pathname.startsWith(item.href + '/');

    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            isItemActive
              ? 'bg-military-700 text-white'
              : 'text-gray-700 hover:bg-military-50'
          )}
        >
          <Icon className="w-5 h-5" />
          {item.label}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
          isActive
            ? 'bg-military-50 text-military-700'
            : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        <div className="flex items-center gap-3">
          <SectionIcon className="w-5 h-5" />
          <span className="font-medium">{section.label}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <ul className="mt-1 mr-4 space-y-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const isItemActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm',
                    isItemActive
                      ? 'bg-military-700 text-white'
                      : 'text-gray-600 hover:bg-military-50'
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
    </li>
  );
}

// ============================================
// Mobile More Menu Component
// ============================================

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
  pathname: string;
  primaryHrefs: string[];
}

function MobileMoreMenu({ isOpen, onClose, sections, pathname, primaryHrefs }: MobileMoreMenuProps) {
  if (!isOpen) return null;

  // Get items not shown in primary nav
  const moreItems = sections.flatMap((section) =>
    section.items.filter((item) => !primaryHrefs.includes(item.href))
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[70vh] overflow-y-auto safe-area-pb">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">תפריט נוסף</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-xl transition-colors',
                      isActive
                        ? 'bg-military-700 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

export function UserLayout({ children }: UserLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isHydrated } = useAuth();

  // State for mobile "More" menu
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // State for desktop collapsible sections (auto-expand active section)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand sections that contain the current path
    navSections.forEach((section) => {
      if (isPathInSection(pathname, section)) {
        initial.add(section.id);
      }
    });
    return initial;
  });

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      // Use replace to prevent back button issues
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  // Auto-expand section when pathname changes
  useEffect(() => {
    navSections.forEach((section) => {
      if (isPathInSection(pathname, section)) {
        setExpandedSections((prev) => new Set(prev).add(section.id));
      }
    });
  }, [pathname]);

  if (!isHydrated || !isAuthenticated || !user) {
    return <PageLoader />;
  }

  // Filter sections based on user role
  const filteredSections = filterNavSections(navSections, user.role);

  // Get all filtered items for mobile "more" menu
  const allItems = getAllNavItems(filteredSections);
  const primaryHrefs = mobileNavConfig.primaryItems.map((item) => item.href);

  // Check if current path is in "more" items (not in primary nav)
  const isMoreActive = allItems.some(
    (item) =>
      !primaryHrefs.includes(item.href) &&
      (pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header />

      {/* Main content with padding for bottom nav on mobile */}
      <main className="flex-1 container mx-auto px-4 py-4 pb-24 lg:pb-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile (5 items max: 4 primary + More) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40 safe-area-pb">
        <div className="flex justify-around items-center h-16 px-1">
          {mobileNavConfig.primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-0',
                  isActive
                    ? 'text-military-700'
                    : 'text-gray-500 hover:text-military-600'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-military-700')} />
                <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-0',
              isMoreActive
                ? 'text-military-700'
                : 'text-gray-500 hover:text-military-600'
            )}
          >
            <MoreHorizontal className={cn('w-5 h-5', isMoreActive && 'text-military-700')} />
            <span className="text-[10px] mt-0.5">{mobileNavConfig.moreMenuLabel}</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu */}
      <MobileMoreMenu
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        sections={filteredSections}
        pathname={pathname}
        primaryHrefs={primaryHrefs}
      />

      {/* Side Navigation - Desktop with Collapsible Sections */}
      <aside className="hidden lg:block fixed right-0 top-16 bottom-0 w-60 bg-white border-l border-gray-200 overflow-y-auto">
        <nav className="p-4">
          <ul className="space-y-2">
            {filteredSections.map((section) => (
              <DesktopNavSection
                key={section.id}
                section={section}
                pathname={pathname}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </ul>
        </nav>
      </aside>

      {/* Desktop main content offset */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          .container {
            margin-right: 15rem;
            max-width: calc(100% - 15rem);
          }
        }
      `}</style>
    </div>
  );
}
