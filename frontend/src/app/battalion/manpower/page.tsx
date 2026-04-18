'use client';

import { useQuery } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { MILITARY_ROLE_LABELS, MilitaryRole } from '@/types';

export default function BattalionManpowerPage() {
  const { data: manpower, isLoading } = useQuery({
    queryKey: queryKeys.battalionManpower,
    queryFn: async () => {
      const res = await api.get('/battalion-dashboard/manpower');
      return res.data;
    },
  });

  return (
    <BattalionLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">כח אדם לפי פלוגה</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {manpower?.map((company: any) => (
              <Card key={company.companyId} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{company.companyName}</h3>
                  <span className="text-2xl font-bold text-military-700">
                    {company.totalUsers}
                  </span>
                </div>

                {/* Role breakdown */}
                <div className="space-y-2 mb-4">
                  {Object.entries(company.roleBreakdown as Record<string, number>).map(
                    ([role, count]) => (
                      <div key={role} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {MILITARY_ROLE_LABELS[role as MilitaryRole] || role}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ),
                  )}
                </div>

                {/* Departments */}
                {company.departments?.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">מחלקות</h4>
                    <div className="space-y-1">
                      {company.departments.map((dept: any) => (
                        <div key={dept.id} className="flex justify-between text-sm">
                          <span>{dept.name}</span>
                          <span className="text-gray-500">{dept.userCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {(!manpower || manpower.length === 0) && (
              <div className="col-span-full text-center py-12 text-gray-400">
                אין נתוני כח אדם
              </div>
            )}
          </div>
        )}
      </div>
    </BattalionLayout>
  );
}
