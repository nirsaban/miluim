'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useIsFullAdmin } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const { user, isHydrated } = useAuth();
  const isFullAdmin = useIsFullAdmin();
  const router = useRouter();

  // Redirect users based on role:
  // - ADMIN users (full admin) → /admin/status
  // - Other users → /dashboard/home
  useEffect(() => {
    if (isHydrated && user) {
      if (isFullAdmin) {
        router.replace('/admin/status');
      } else {
        router.replace('/dashboard/home');
      }
    }
  }, [isHydrated, user, isFullAdmin, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Spinner />
    </div>
  );
}
