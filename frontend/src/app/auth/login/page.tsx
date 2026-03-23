'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  checkWebAuthnSupport,
  authenticateWithPasskey,
  type WebAuthnSupport,
} from '@/lib/webauthn';

interface LoginForm {
  personalId: string;
  password: string;
}

const LOGIN_METHOD_PREF_KEY = 'miluim_login_method_pref';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isHydrated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupport | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [prefChecked, setPrefChecked] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginForm>();

  const personalId = watch('personalId');

  // Check WebAuthn support and user preference on mount
  useEffect(() => {
    async function checkSupport() {
      try {
        const support = await checkWebAuthnSupport();
        setWebAuthnSupport(support);
      } catch (error) {
        console.error('Error checking WebAuthn support:', error);
      }
    }
    checkSupport();

    // Check if user previously preferred password login
    const pref = localStorage.getItem(LOGIN_METHOD_PREF_KEY);
    if (pref === 'password') {
      setShowPasswordForm(true);
    }
    setPrefChecked(true);
  }, []);

  // Redirect if already authenticated
  // Use replace to prevent back-button redirect loops
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);

      if (response.data.success) {
        // Wait for token to be stored before redirecting
        await login(response.data.user, response.data.token);
        toast.success('התחברת בהצלחה!');

        // Check if user needs to set up passkey
        // Skip if user prefers password login (they explicitly chose to skip biometric)
        const prefersPassword = localStorage.getItem(LOGIN_METHOD_PREF_KEY) === 'password';
        if (!response.data.user.hasPasskey && webAuthnSupport?.isPlatformAuthenticatorAvailable && !prefersPassword) {
          router.push('/auth/passkey-setup');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בהתחברות';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!webAuthnSupport?.isSupported) {
      toast.error('הדפדפן לא תומך בזיהוי ביומטרי');
      return;
    }

    setIsPasskeyLoading(true);
    try {
      // Try discoverable credential flow (no username needed)
      const result = await authenticateWithPasskey();

      if (result.success) {
        // Clear password preference on successful biometric login
        localStorage.removeItem(LOGIN_METHOD_PREF_KEY);
        await login(result.user, result.token);
        toast.success('התחברת בהצלחה!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Passkey login error:', error);
      const message = error.response?.data?.message || error.message || 'שגיאה בהתחברות עם מפתח גישה';
      toast.error(message);
      // Fall back to showing password form
      setShowPasswordForm(true);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  // Show loading state while checking hydration and preferences
  if (!isHydrated || !prefChecked) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-military-700" />
        </div>
      </AuthLayout>
    );
  }

  // If platform authenticator is available and not showing password form, show passkey-first UI
  const showPasskeyFirst = webAuthnSupport?.isPlatformAuthenticatorAvailable && !showPasswordForm;

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        התחברות למערכת
      </h2>

      {/* Passkey Login Option */}
      {showPasskeyFirst && (
        <div className="space-y-4 mb-6">
          <Button
            type="button"
            onClick={handlePasskeyLogin}
            className="w-full flex items-center justify-center gap-2"
            isLoading={isPasskeyLoading}
            disabled={isPasskeyLoading}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
              />
            </svg>
            {isPasskeyLoading ? 'מאמת...' : 'התחבר עם זיהוי ביומטרי'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">או</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowPasswordForm(true);
              // Remember user's preference for password login
              localStorage.setItem(LOGIN_METHOD_PREF_KEY, 'password');
            }}
            className="w-full text-center text-military-700 hover:underline text-sm"
          >
            התחבר עם מספר אישי וסיסמה
          </button>
        </div>
      )}

      {/* Password Login Form */}
      {(!showPasskeyFirst || showPasswordForm) && (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="מספר אישי"
              placeholder="1234567"
              error={errors.personalId?.message}
              {...register('personalId', {
                required: 'מספר אישי הוא שדה חובה',
              })}
            />

            <Input
              label="סיסמה"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', {
                required: 'סיסמה היא שדה חובה',
              })}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              התחבר
            </Button>
          </form>

          {/* Back to passkey option */}
          {showPasswordForm && webAuthnSupport?.isPlatformAuthenticatorAvailable && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  // Clear password preference when user wants to try biometric
                  localStorage.removeItem(LOGIN_METHOD_PREF_KEY);
                }}
                className="w-full text-center text-military-700 hover:underline text-sm flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                חזרה להתחברות עם זיהוי ביומטרי
              </button>
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          עדיין לא השלמת הרשמה?{' '}
          <Link
            href="/auth/register"
            className="text-military-700 font-medium hover:underline"
          >
            השלם הרשמה
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
