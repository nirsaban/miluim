'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus, MoreVertical, Download } from 'lucide-react';
import { Button } from './Button';

const PWA_DISMISSED_KEY = 'pwa-install-dismissed';
const PWA_DISMISSED_EXPIRY_DAYS = 7;

interface PWAInstallPromptProps {
  onClose?: () => void;
}

type Platform = 'ios' | 'android' | 'desktop' | null;

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null;

  const ua = navigator.userAgent.toLowerCase();

  // Check iOS
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }

  // Check Android
  if (/android/.test(ua)) {
    return 'android';
  }

  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // Check iOS standalone
  if ('standalone' in window.navigator) {
    return (window.navigator as { standalone?: boolean }).standalone === true;
  }

  // Check PWA display mode
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);
    if (!dismissed) return false;

    const dismissedTime = parseInt(dismissed, 10);
    const expiryTime = dismissedTime + (PWA_DISMISSED_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    return Date.now() < expiryTime;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

export function PWAInstallPrompt({ onClose }: PWAInstallPromptProps) {
  const [platform, setPlatform] = useState<Platform>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show on mobile and if not already installed or dismissed
    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    const isMobile = detectedPlatform === 'ios' || detectedPlatform === 'android';
    const alreadyInstalled = isStandalone();
    const alreadyDismissed = isDismissed();

    setShouldShow(isMobile && !alreadyInstalled && !alreadyDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed();
    setShouldShow(false);
    onClose?.();
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-military-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-military-600 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-military-700">התקן את האפליקציה</h3>
              <p className="text-sm text-gray-600">לחוויה טובה יותר</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {platform === 'ios' && (
            <div className="space-y-4">
              <p className="text-gray-700 text-center mb-4">
                הוסף את האפליקציה למסך הבית שלך לגישה מהירה וקלה
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">לחץ על כפתור השיתוף</p>
                    <p className="text-sm text-gray-600 mt-1">
                      הכפתור נמצא בתחתית המסך בספארי
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-blue-600">
                      <Share className="w-5 h-5" />
                      <span className="text-sm">Share</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">בחר &quot;הוסף למסך הבית&quot;</p>
                    <p className="text-sm text-gray-600 mt-1">
                      גלול למטה בתפריט ולחץ על האפשרות
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-gray-700">
                      <Plus className="w-5 h-5" />
                      <span className="text-sm">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">לחץ על &quot;הוסף&quot;</p>
                    <p className="text-sm text-gray-600 mt-1">
                      האפליקציה תופיע במסך הבית שלך
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {platform === 'android' && (
            <div className="space-y-4">
              <p className="text-gray-700 text-center mb-4">
                הוסף את האפליקציה למסך הבית שלך לגישה מהירה וקלה
              </p>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">לחץ על תפריט הדפדפן</p>
                    <p className="text-sm text-gray-600 mt-1">
                      שלוש נקודות בפינה הימנית העליונה
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-gray-700">
                      <MoreVertical className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">בחר &quot;התקן אפליקציה&quot;</p>
                    <p className="text-sm text-gray-600 mt-1">
                      או &quot;הוסף למסך הבית&quot;
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-gray-700">
                      <Download className="w-5 h-5" />
                      <span className="text-sm">Install app</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-military-100 text-military-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">אשר את ההתקנה</p>
                    <p className="text-sm text-gray-600 mt-1">
                      האפליקציה תופיע במסך הבית שלך
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <Button
            variant="secondary"
            onClick={handleDismiss}
            className="flex-1"
          >
            אולי אחר כך
          </Button>
          <Button
            onClick={handleDismiss}
            className="flex-1"
          >
            הבנתי
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to manage PWA install prompt state
export function usePWAInstall() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const platform = detectPlatform();
    const isMobile = platform === 'ios' || platform === 'android';
    const alreadyInstalled = isStandalone();
    const alreadyDismissed = isDismissed();

    // Show prompt on first mobile load if not installed and not dismissed
    if (isMobile && !alreadyInstalled && !alreadyDismissed) {
      // Small delay to not show immediately on page load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closePrompt = () => {
    setShowPrompt(false);
  };

  return { showPrompt, closePrompt };
}
