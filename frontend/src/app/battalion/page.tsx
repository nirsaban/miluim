'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Building2, Users, Calendar, FileText, Map } from 'lucide-react';

import { IsraelMap } from '@/components/battalion/IsraelMap';

export default function BattalionOverviewPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: queryKeys.battalionOverview,
    queryFn: async () => {
      const res = await api.get('/battalion-dashboard/overview');
      return res.data;
    },
  });

  const { data: mapData } = useQuery({
    queryKey: ['battalion-map'],
    queryFn: async () => {
      const res = await api.get('/battalion-dashboard/map');
      return res.data;
    },
  });

  return (
    <BattalionLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">סקירה כללית - גדוד</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : overview ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-military-600" />
                <div className="text-3xl font-bold text-military-700">
                  {overview.companiesCount}
                </div>
                <div className="text-sm text-gray-500">פלוגות פעילות</div>
              </Card>
              <Card className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-3xl font-bold text-blue-700">
                  {overview.totalUsers}
                </div>
                <div className="text-sm text-gray-500">סה&quot;כ חיילים</div>
              </Card>
              <Card className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-3xl font-bold text-green-700">
                  {overview.activeServiceCycles}
                </div>
                <div className="text-sm text-gray-500">סבבים פעילים</div>
              </Card>
              <Card className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <div className="text-3xl font-bold text-orange-700">
                  {overview.pendingLeaveRequests}
                </div>
                <div className="text-sm text-gray-500">בקשות ממתינות</div>
              </Card>
            </div>

            {/* Israel Map */}
            {mapData && mapData.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Map className="w-5 h-5 text-military-600" />
                  <h2 className="text-lg font-semibold">מפת פריסה</h2>
                  <span className="text-sm text-gray-400">({mapData.length} פלוגות פעילות)</span>
                </div>
                <IsraelMap points={mapData} />
              </Card>
            )}

            {/* Companies Table */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">פלוגות</h2>
              <div className="divide-y">
                {overview.companies?.map((company: any) => (
                  <Link
                    key={company.id}
                    href={`/battalion/companies/${company.id}`}
                    className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <span className="font-medium">{company.name}</span>
                      <span className="text-gray-400 text-sm mr-2">({company.code})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {company._count?.users || 0} חיילים
                      </span>
                      <span className="text-gray-300">&larr;</span>
                    </div>
                  </Link>
                ))}
                {(!overview.companies || overview.companies.length === 0) && (
                  <div className="py-4 text-center text-gray-400">
                    אין פלוגות עדיין
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </BattalionLayout>
  );
}
