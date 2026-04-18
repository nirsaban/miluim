'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';
import { setAuthToken, removeAuthToken, setUserData, getAuthToken, getUserData } from '@/lib/api';
import { useEffect, useState, useCallback } from 'react';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  _isLoggingOut: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (state: boolean) => void;
  restoreFromCookies: () => boolean;
  validateSession: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      _isLoggingOut: false,
      login: async (user: User, token: string) => {
        // 1. Store token in cookie first
        setAuthToken(token);
        setUserData(user);

        // 2. Wait for next tick to ensure cookie is persisted and readable
        await new Promise(resolve => setTimeout(resolve, 10));

        // 3. Verify token was stored correctly
        const storedToken = getAuthToken();
        if (!storedToken) {
          console.error('Token not stored correctly, retrying...');
          setAuthToken(token);
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 4. Only then update auth state
        set({ user, isAuthenticated: true, _isLoggingOut: false });
      },
      logout: () => {
        set({ _isLoggingOut: true });
        removeAuthToken();
        set({ user: null, isAuthenticated: false, _isLoggingOut: false });
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
          return true;
        }
        return false;
      },
      // Validate that session is consistent across stores
      validateSession: () => {
        const token = getAuthToken();
        const cookieUser = getUserData();
        const state = get();

        // If we think we're authenticated but have no token, we're not really authenticated
        if (state.isAuthenticated && !token) {
          set({ user: null, isAuthenticated: false });
          return false;
        }

        // If we have a token but no user data, try to restore
        if (token && !state.user && cookieUser) {
          set({ user: cookieUser, isAuthenticated: true });
          return true;
        }

        return state.isAuthenticated && !!token;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After rehydration, validate against cookies
        if (state) {
          const token = getAuthToken();
          const user = getUserData();

          // Only set authenticated if BOTH localStorage and cookies agree
          if (token && user) {
            state.user = user;
            state.isAuthenticated = true;
          } else {
            // If cookies are missing, clear localStorage auth state too
            state.user = null;
            state.isAuthenticated = false;
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

  // Validate session on mount and periodically
  const validateAndSync = useCallback(() => {
    const token = getAuthToken();
    const user = getUserData();

    // If we have valid cookie data, ensure store is synced
    if (token && user) {
      if (!store.isAuthenticated) {
        store.restoreFromCookies();
      }
      return true;
    }

    // If cookies are missing but store thinks we're authenticated, clear store
    if (!token && store.isAuthenticated) {
      store.logout();
      return false;
    }

    return store.isAuthenticated;
  }, [store]);

  useEffect(() => {
    // Wait for Zustand hydration
    if (!store._hasHydrated) {
      return;
    }

    // Validate and sync state
    validateAndSync();
    setIsHydrated(true);
  }, [store._hasHydrated, validateAndSync]);

  // Re-validate when window regains focus (handles expired sessions)
  useEffect(() => {
    const handleFocus = () => {
      if (store._hasHydrated) {
        validateAndSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [store._hasHydrated, validateAndSync]);

  return {
    ...store,
    isHydrated,
    validateSession: validateAndSync,
  };
};

import { isAdminMilitaryRole, isDutyOfficer as checkIsDutyOfficer, MilitaryRole } from '@/types';

// Check if user is BATTALION_ADMIN
export const useIsBattalionAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'BATTALION_ADMIN';
};

// Can access admin panel (ADMIN, OFFICER, LOGISTICS, SYSTEM_TECHNICAL, BATTALION_ADMIN - NOT COMMANDER)
export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  // Check UserRole OR admin-level MilitaryRole
  if (user?.role === 'ADMIN') return true;
  if (user?.role === 'SYSTEM_TECHNICAL') return true;
  if (user?.role === 'BATTALION_ADMIN') return true;
  if (user?.role === 'OFFICER') return true;
  if (user?.role === 'LOGISTICS') return true;
  // Admin-level military roles (PLATOON_COMMANDER, SERGEANT_MAJOR, OPERATIONS_SGT)
  if (user?.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
  return false;
};

// Full admin access (ADMIN, SYSTEM_TECHNICAL, or admin-level MilitaryRoles)
// These users have full system access, not limited like LOGISTICS or DUTY_OFFICER
export const useIsFullAdmin = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'ADMIN') return true;
  if (user?.role === 'SYSTEM_TECHNICAL') return true;
  if (user?.role === 'BATTALION_ADMIN') return true;
  if (user?.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
  return false;
};

// Check if user is SYSTEM_TECHNICAL (developer access)
export const useIsSystemTech = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'SYSTEM_TECHNICAL';
};

// Check if user is DUTY_OFFICER (department-scoped access)
export const useIsDutyOfficer = () => {
  const user = useAuthStore((state) => state.user);
  return user?.militaryRole ? checkIsDutyOfficer(user.militaryRole) : false;
};

// Get the user's military role
export const useMilitaryRole = (): MilitaryRole | undefined => {
  const user = useAuthStore((state) => state.user);
  return user?.militaryRole;
};

// Can manage shifts (ADMIN + LOGISTICS + SYSTEM_TECHNICAL)
export const useCanManageShifts = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'ADMIN') return true;
  if (user?.role === 'SYSTEM_TECHNICAL') return true;
  if (user?.role === 'LOGISTICS') return true;
  if (user?.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
  return false;
};

// Can manage forms (ADMIN + OFFICER + SYSTEM_TECHNICAL, but NOT LOGISTICS)
export const useCanManageForms = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'ADMIN') return true;
  if (user?.role === 'SYSTEM_TECHNICAL') return true;
  if (user?.role === 'OFFICER') return true;
  if (user?.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
  return false;
};

// Can manage messages (ADMIN + SYSTEM_TECHNICAL only, NOT LOGISTICS or DUTY_OFFICER)
export const useCanManageMessages = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'ADMIN') return true;
  if (user?.role === 'SYSTEM_TECHNICAL') return true;
  if (user?.militaryRole && isAdminMilitaryRole(user.militaryRole)) return true;
  return false;
};
