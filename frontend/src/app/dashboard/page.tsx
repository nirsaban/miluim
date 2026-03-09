'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  // Redirect ALL users to /dashboard/home
  useEffect(() => {
    if (isHydrated && user) {
      router.replace('/dashboard/home');
    }
  }, [isHydrated, user, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Spinner />
    </div>
  );
}
