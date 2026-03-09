'use client';

import { UserLayout } from '@/components/layout/UserLayout';
import { GallerySection } from '@/components/dashboard/GallerySection';
import { RecommendationsSection } from '@/components/dashboard/RecommendationsSection';
import { FoodSection } from '@/components/dashboard/FoodSection';

export default function SocialPage() {
  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">חברתי והמלצות</h1>
        <p className="text-gray-600 mt-1">גלריית פלוגה, המלצות ותפעול מזון</p>
      </div>

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
