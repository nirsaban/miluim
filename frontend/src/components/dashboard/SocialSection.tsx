'use client';

import Link from 'next/link';
import { Sparkles, Camera, Star, Utensils, ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface SocialSectionProps {
  className?: string;
}

export function SocialSection({ className }: SocialSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>חברתי והמלצות</span>
        </div>
        <Link
          href="/dashboard/social"
          className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-military-100 transition-colors"
        >
          עוד
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {/* Social Initiatives Banner */}
        <Link href="/dashboard/social/initiation">
          <div className="mb-4 bg-gradient-to-l from-military-600 to-military-700 rounded-xl p-4 cursor-pointer hover:from-military-700 hover:to-military-800 transition-all">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">יוזמות חברתיות</h3>
                <p className="text-white/80 text-sm truncate">מארגנים יציאה? מזמינים חברים!</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-purple-700">גלריה</span>
          </Link>
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-yellow-700">המלצות</span>
          </Link>
          <Link
            href="/dashboard/social"
            className="flex flex-col items-center gap-2 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Utensils className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-700">מזון</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
