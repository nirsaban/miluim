'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { setAuthToken, removeAuthToken, setUserData, getAuthToken, getUserData } from '@/lib/api';
import { useEffect, useState } from 'react';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
  restoreFromCookies: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (user: User, token: string) => {
        setAuthToken(token);
        setUserData(user);
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        removeAuthToken();
        set({ user: null, isAuthenticated: false });
      },
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
      restoreFromCookies: () => {
        const token = getAuthToken();
        const user = getUserData();
        if (token && user) {
          set({ user, isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, also check cookies as backup
        if (state) {
          const token = getAuthToken();
          const user = getUserData();
          if (token && user && !state.isAuthenticated) {
            state.user = user;
            state.isAuthenticated = true;
          }
          state._hasHydrated = true;
        }
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Custom hook that handles hydration properly
export const useAuth = () => {
  const store = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated from Zustand
    if (store._hasHydrated) {
      setIsHydrated(true);
      return;
    }

    // Fallback: restore from cookies if localStorage failed
    const token = getAuthToken();
    const user = getUserData();

    if (token && user && !store.isAuthenticated) {
      store.login(user, token);
    }

    setIsHydrated(true);
  }, [store._hasHydrated]);

  return {
    ...store,
    isHydrated,
  };
};

export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'ADMIN' || user?.role === 'COMMANDER' || user?.role === 'OFFICER' || user?.role === 'LOGISTICS';
};
