'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-military-700 via-military-800 to-military-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-xl overflow-hidden">
              <Image
                src="/icons/gemini_logo.png"
                alt="לוגו מערכת יוגב"
                width={96}
                height={96}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">מערכת ניהול</h1>
            <p className="text-military-200 mt-1 text-sm sm:text-base">פלוגת יוגב - מערכת תפעול פלוגתית</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6">{children}</div>
        </div>
      </div>
      <div className="text-center py-4 text-military-300 text-sm">
        <p>מילטק - מילואים של העתיד</p>
      </div>
    </div>
  );
}
