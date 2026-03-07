'use client';

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-military-700 to-military-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
              <span className="text-military-700 font-bold text-3xl">י</span>
            </div>
            <h1 className="text-3xl font-bold text-white">מערכת ניהול - פלוגת יוגב</h1>
            <p className="text-military-200 mt-2">מערכת תפעול פלוגתית</p>
          </div>
          <div className="bg-white rounded-lg shadow-xl p-6">{children}</div>
        </div>
      </div>
      <div className="text-center py-4 text-military-300">
        <p>פלוגת יוגב – ביחד מנצחים</p>
      </div>
    </div>
  );
}
