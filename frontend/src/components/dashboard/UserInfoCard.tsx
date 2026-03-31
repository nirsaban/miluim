'use client';

import { MapPin, Building2, Phone, Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatWhatsAppLink, cn } from '@/lib/utils';
import { MilitaryRole } from '@/types';

interface UserInfoCardProps {
  isLoading?: boolean;
  activeZone?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  departmentOfficer?: {
    id: string;
    fullName: string;
    phone: string;
    militaryRole?: MilitaryRole;
  } | null;
  activeCycle?: {
    name: string;
    status: string;
  } | null;
  className?: string;
}

export function UserInfoCard({
  isLoading,
  activeZone,
  department,
  departmentOfficer,
  activeCycle,
  className,
}: UserInfoCardProps) {
  return (
    <Card className={className}>
      <CardContent className="py-3 sm:py-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
              <div className="p-1.5 bg-military-100 rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-military-600" />
              </div>
              <div className="min-w-0">
                <span className="text-gray-400 text-[10px] block">אזור</span>
                <span className="font-medium text-gray-900 text-xs truncate block">
                  {activeZone?.name || 'לא מוגדר'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
              <div className="p-1.5 bg-military-100 rounded-lg">
                <Building2 className="w-3.5 h-3.5 text-military-600" />
              </div>
              <div className="min-w-0">
                <span className="text-gray-400 text-[10px] block">מחלקה</span>
                <span className="font-medium text-gray-900 text-xs truncate block">
                  {department?.name || 'לא מוגדר'}
                </span>
              </div>
            </div>
            {departmentOfficer && (
              <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl col-span-2 sm:col-span-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Phone className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-gray-400 text-[10px] block">קצין מחלקה</span>
                  <a
                    href={formatWhatsAppLink(departmentOfficer.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-600 hover:underline text-xs truncate block"
                  >
                    {departmentOfficer.fullName}
                  </a>
                </div>
              </div>
            )}
            {activeCycle?.status === 'ACTIVE' && (
              <div className={cn(
                "flex items-center gap-2 p-2.5 rounded-xl",
                departmentOfficer ? "col-span-2 sm:col-span-4" : "col-span-2",
                "bg-military-50 border border-military-100"
              )}>
                <div className="p-1.5 bg-military-100 rounded-lg">
                  <Timer className="w-3.5 h-3.5 text-military-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-gray-400 text-[10px] block">סבב נוכחי</span>
                  <span className="font-medium text-military-700 text-xs truncate block">
                    {activeCycle.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
