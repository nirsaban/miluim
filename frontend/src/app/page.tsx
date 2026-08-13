'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * The root used to send every visitor to /auth/login, which left the public
 * marketing page at /about unreachable from the front door.
 *
 * Auth state lives in localStorage (zustand persist), so it cannot be read on
 * the server — hence the client-side bounce, mirroring what /auth/login
 * already does for signed-in users.
 */
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  useEffect(() => {
    if (!isHydrated) return;
    router.replace(isAuthenticated ? '/dashboard' : '/about');
  }, [isHydrated, isAuthenticated, router]);

  return null;
}
