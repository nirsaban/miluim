'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="bg-military-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="text-military-700 font-bold text-base sm:text-lg">י</span>
            </div>
            <span className="text-lg sm:text-xl font-bold hidden sm:block">מערכת ניהול - פלוגת יוגב</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="hover:text-military-200 transition-colors"
            >
              ראשי
            </Link>
            {isAdmin && (
              <Link
                href="/admin/messages"
                className="hover:text-military-200 transition-colors"
              >
                ניהול
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard#notifications"
              className="relative p-2 hover:bg-military-600 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 bg-military-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm">{user?.fullName}</span>
            </div>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-military-600 hover:bg-military-500 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">יציאה</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-military-600 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-military-600">
            <nav className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-2 hover:bg-military-600 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ראשי
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/messages"
                  className="px-4 py-2 hover:bg-military-600 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ניהול
                </Link>
              )}
              <div className="border-t border-military-600 mt-2 pt-2">
                <div className="px-4 py-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{user?.fullName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 flex items-center gap-2 hover:bg-military-600 rounded-lg transition-colors text-right"
                >
                  <LogOut className="w-4 h-4" />
                  <span>יציאה</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
