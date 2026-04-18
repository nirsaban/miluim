'use client';

import { useQuery } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export default function BattalionLeavesPage() {
  const { data: leaves, isLoading } = useQuery({
    queryKey: queryKeys.battalionLeaves,
    queryFn: async () => {
      const res = await api.get('/battalion-dashboard/leaves');
      return res.data;
    },
  });

  return (
    <BattalionLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">סיכום יציאות לפי פלוגה</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <>
            {/* Summary table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">פלוגה</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">סה&quot;כ</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">בבסיס</th>
                      <th className="px-4 py-3 text-center font-medium text-green-600">בחוץ</th>
                      <th className="px-4 py-3 text-center font-medium text-yellow-600">ממתינים</th>
                      <th className="px-4 py-3 text-center font-medium text-red-600">באיחור</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leaves?.map((company: any) => (
                      <tr key={company.companyId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {company.companyName}
                          <span className="text-gray-400 text-xs mr-1">({company.companyCode})</span>
                        </td>
                        <td className="px-4 py-3 text-center">{company.totalSoldiers}</td>
                        <td className="px-4 py-3 text-center">{company.inBase}</td>
                        <td className="px-4 py-3 text-center text-green-700 font-medium">
                          {company.active}
                        </td>
                        <td className="px-4 py-3 text-center text-yellow-700 font-medium">
                          {company.pending}
                        </td>
                        <td className="px-4 py-3 text-center text-red-700 font-medium">
                          {company.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {leaves && leaves.length > 0 && (
                    <tfoot className="bg-gray-50 font-medium">
                      <tr>
                        <td className="px-4 py-3">סה&quot;כ</td>
                        <td className="px-4 py-3 text-center">
                          {leaves.reduce((s: number, c: any) => s + c.totalSoldiers, 0)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {leaves.reduce((s: number, c: any) => s + c.inBase, 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-green-700">
                          {leaves.reduce((s: number, c: any) => s + c.active, 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-yellow-700">
                          {leaves.reduce((s: number, c: any) => s + c.pending, 0)}
                        </td>
                        <td className="px-4 py-3 text-center text-red-700">
                          {leaves.reduce((s: number, c: any) => s + c.overdue, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>

            {(!leaves || leaves.length === 0) && (
              <Card className="p-8 text-center text-gray-400">
                אין נתוני יציאות
              </Card>
            )}
          </>
        )}
      </div>
    </BattalionLayout>
  );
}
