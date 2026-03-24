'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useIsSystemTech } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/Spinner';

interface SystemLayoutProps {
  children: ReactNode;
}

export default function SystemLayout({ children }: SystemLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const isSystemTech = useIsSystemTech();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    } else if (isHydrated && !isSystemTech) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isSystemTech, isHydrated, router]);

  if (!isHydrated || !isAuthenticated || !isSystemTech) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DB</span>
            </div>
            <h1 className="text-xl font-bold text-white">System Database Manager</h1>
          </div>
          <a
            href="/dashboard"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
