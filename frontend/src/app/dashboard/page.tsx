'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationsSection } from '@/components/dashboard/NotificationsSection';
import { OperationalSection } from '@/components/dashboard/OperationalSection';
import { MessagesSection } from '@/components/dashboard/MessagesSection';
import { ContactsSection } from '@/components/dashboard/ContactsSection';
import { FoodSection } from '@/components/dashboard/FoodSection';
import { ShiftsSection } from '@/components/dashboard/ShiftsSection';
import { FormsSection } from '@/components/dashboard/FormsSection';
import { RecommendationsSection } from '@/components/dashboard/RecommendationsSection';
import { GallerySection } from '@/components/dashboard/GallerySection';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
            <span className="text-military-700 font-bold text-2xl">י</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-military-700">
              ברוך שובך, {user?.fullName}
            </h1>
            <p className="text-gray-600">מערכת ניהול - פלוגת יוגב - מערכת תפעול פלוגתית</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Section 1: Notifications */}
        <div className="lg:col-span-2 xl:col-span-1">
          <NotificationsSection />
        </div>

        {/* Section 2: Operational Links */}
        <div className="lg:col-span-2 xl:col-span-1">
          <OperationalSection />
        </div>

        {/* Section 3: Daily Messages */}
        <div className="lg:col-span-2 xl:col-span-1">
          <MessagesSection />
        </div>

        {/* Section 3: Important Contacts */}
        <div>
          <ContactsSection />
        </div>

        {/* Section 4: Food Operations */}
        <div>
          <FoodSection />
        </div>

        {/* Section 5: Shift Schedule */}
        <div>
          <ShiftsSection />
        </div>

        {/* Section 6: Important Forms */}
        <div>
          <FormsSection />
        </div>

        {/* Section 7: Soldier Recommendations */}
        <div>
          <RecommendationsSection />
        </div>

        {/* Section 8: Platoon Gallery */}
        <div>
          <GallerySection />
        </div>
      </div>
    </DashboardLayout>
  );
}
