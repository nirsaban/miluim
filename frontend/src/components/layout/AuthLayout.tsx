'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-app bg-cinematic flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-glass border border-border rounded-full mx-auto flex items-center justify-center mb-4 shadow-glow overflow-hidden backdrop-blur-glass">
              <Image
                src="/icons/gemini_logo.png"
                alt="לוגו מערכת יוגב"
                width={96}
                height={96}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-primary">מערכת ניהול</h1>
            <p className="text-content-secondary mt-1 text-sm sm:text-base">פלוגת יוגב - מערכת תפעול פלוגתית</p>
          </div>
          <div className="bg-glass backdrop-blur-glass-lg rounded-card border border-border shadow-card p-5 sm:p-6">{children}</div>
        </div>
      </div>
      <div className="text-center py-4 text-content-muted text-sm">
        <p>מילטק - מילואים של העתיד</p>
      </div>
    </div>
  );
}
