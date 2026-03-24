'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-military-700 via-military-800 to-military-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="mb-4 flex justify-center">
              <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-white shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/logo.png"
                  alt="מילטק"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <p className="text-military-200 text-sm sm:text-base">העתיד של המילואים</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6">{children}</div>
        </div>
      </div>
      <div className="text-center py-4 text-military-300 text-sm">
        <p>מילטק - העתיד של המילואים</p>
      </div>
    </div>
  );
}
