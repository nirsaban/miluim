'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import {
  checkWebAuthnSupport,
  registerPasskey,
  getDeviceName,
  type WebAuthnSupport,
} from '@/lib/webauthn';

export default function PasskeySetupPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupport | null>(null);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);

  // Check WebAuthn support on mount
  useEffect(() => {
    async function checkSupport() {
      try {
        const support = await checkWebAuthnSupport();
        setWebAuthnSupport(support);
      } catch (error) {
        console.error('Error checking WebAuthn support:', error);
      } finally {
        setIsCheckingSupport(false);
      }
    }
    checkSupport();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Redirect if user already has passkey
  useEffect(() => {
    if (isHydrated && user?.hasPasskey) {
      router.push('/dashboard');
    }
  }, [isHydrated, user, router]);

  const handleEnrollPasskey = async () => {
    if (!webAuthnSupport?.isSupported || !webAuthnSupport?.isPlatformAuthenticatorAvailable) {
      toast.error('המכשיר שלך לא תומך בזיהוי ביומטרי');
      return;
    }

    setIsLoading(true);
    try {
      const deviceName = getDeviceName();
      const result = await registerPasskey(deviceName);

      if (result.success && result.verified) {
        toast.success('מפתח הגישה נרשם בהצלחה!');
        // Update user state to reflect passkey enrollment
        updateUser({ hasPasskey: true });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Passkey enrollment error:', error);
      const message = error.response?.data?.message || error.message || 'שגיאה ברישום מפתח הגישה';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skip only if device doesn't support WebAuthn
    if (!webAuthnSupport?.isPlatformAuthenticatorAvailable) {
      router.push('/dashboard');
    } else {
      toast.error('יש להגדיר מפתח גישה לפני המשך');
    }
  };

  if (!isHydrated || isCheckingSupport) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-military-700" />
        </div>
      </AuthLayout>
    );
  }

  // Device doesn't support WebAuthn at all
  if (!webAuthnSupport?.isSupported) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">הדפדפן לא נתמך</h2>
          <p className="text-gray-600">
            הדפדפן שלך לא תומך בזיהוי ביומטרי.
            <br />
            אנא השתמש בדפדפן מודרני (Chrome, Safari, Edge) כדי להפעיל את התכונה.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            המשך ללא זיהוי ביומטרי
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Device doesn't have platform authenticator (Face ID / Touch ID / Windows Hello)
  if (!webAuthnSupport?.isPlatformAuthenticatorAvailable) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
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
          </div>
          <h2 className="text-xl font-bold text-gray-900">זיהוי ביומטרי לא זמין</h2>
          <p className="text-gray-600">
            המכשיר שלך לא תומך בזיהוי ביומטרי (Face ID / Touch ID / טביעת אצבע).
            <br />
            תוכל להמשיך להתחבר עם סיסמה.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            המשך למערכת
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Device supports WebAuthn - show enrollment UI
  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-military-100 rounded-full mx-auto flex items-center justify-center">
          <svg
            className="w-10 h-10 text-military-700"
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
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">הגדרת זיהוי ביומטרי</h2>
          <p className="text-gray-600">
            שלום {user?.fullName}!
            <br />
            הגדר זיהוי ביומטרי להתחברות מהירה ומאובטחת.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-right">
          <h3 className="font-medium text-gray-900 mb-2">מה זה כולל?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>התחברות מהירה עם Face ID / Touch ID / טביעת אצבע</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>אבטחה מתקדמת - ללא סיסמאות לזכור</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>המידע הביומטרי נשמר במכשיר בלבד</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleEnrollPasskey}
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'מאמת...' : 'הגדר זיהוי ביומטרי'}
        </Button>

        <p className="text-xs text-gray-500">
          לחיצה על הכפתור תפתח את מערכת הזיהוי הביומטרי של המכשיר שלך.
        </p>
      </div>
    </AuthLayout>
  );
}
