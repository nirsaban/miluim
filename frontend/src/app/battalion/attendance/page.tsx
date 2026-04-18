'use client';

import { useQuery } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export default function BattalionAttendancePage() {
  const { data: attendance, isLoading } = useQuery({
    queryKey: queryKeys.battalionAttendance,
    queryFn: async () => {
      const res = await api.get('/battalion-dashboard/attendance');
      return res.data;
    },
  });

  return (
    <BattalionLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">נוכחות - סבבי מילואים</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : attendance?.length > 0 ? (
          <div className="space-y-4">
            {attendance.map((cycle: any) => (
              <Card key={cycle.cycleId} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{cycle.cycleName}</h3>
                    {cycle.company && (
                      <span className="text-sm text-gray-500">{cycle.company.name}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(cycle.startDate).toLocaleDateString('he-IL')}
                    {cycle.endDate && ` - ${new Date(cycle.endDate).toLocaleDateString('he-IL')}`}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold">{cycle.stats.total}</div>
                    <div className="text-xs text-gray-500">סה&quot;כ</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-700">{cycle.stats.arrived}</div>
                    <div className="text-xs text-gray-500">הגיעו</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-700">{cycle.stats.notComing}</div>
                    <div className="text-xs text-gray-500">לא מגיעים</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-700">{cycle.stats.pending}</div>
                    <div className="text-xs text-gray-500">ממתינים</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="text-lg font-bold text-orange-700">{cycle.stats.late}</div>
                    <div className="text-xs text-gray-500">באיחור</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-700">{cycle.stats.leftEarly}</div>
                    <div className="text-xs text-gray-500">יצאו מוקדם</div>
                  </div>
                </div>

                {/* Reasons */}
                {Object.keys(cycle.reasons).length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">סיבות אי-הגעה</h4>
                    <div className="space-y-1">
                      {Object.entries(cycle.reasons as Record<string, number>).map(([reason, count]) => (
                        <div key={reason} className="flex justify-between text-sm">
                          <span className="text-gray-600">{reason}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-gray-400">
            אין סבבי מילואים פעילים
          </Card>
        )}
      </div>
    </BattalionLayout>
  );
}
