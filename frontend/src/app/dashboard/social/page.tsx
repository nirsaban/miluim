'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { GallerySection } from '@/components/dashboard/GallerySection';
import { RecommendationsSection } from '@/components/dashboard/RecommendationsSection';
import { FoodSection } from '@/components/dashboard/FoodSection';
import { Card, CardContent } from '@/components/ui/Card';

export default function SocialPage() {
  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">חברתי והמלצות</h1>
        <p className="text-gray-600 mt-1">גלריית פלוגה, המלצות ותפעול מזון</p>
      </div>

      {/* Social Initiatives Banner */}
      <Link href="/dashboard/social/initiation">
        <Card className="mb-6 bg-gradient-to-l from-military-600 to-military-700 border-0 cursor-pointer hover:from-military-700 hover:to-military-800 transition-all">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">יוזמות חברתיות</h3>
                  <p className="text-white/80 text-sm">מארגנים יציאה? מזמינים חברים להצטרף!</p>
                </div>
              </div>
              <span className="text-white/80">לחץ כאן &larr;</span>
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gallery */}
        <div className="lg:col-span-2">
          <GallerySection />
        </div>

        {/* Recommendations */}
        <div>
          <RecommendationsSection />
        </div>

        {/* Food Operations */}
        <div>
          <FoodSection />
        </div>
      </div>
    </UserLayout>
  );
}
