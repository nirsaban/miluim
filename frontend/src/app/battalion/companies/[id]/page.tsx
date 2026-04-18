'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  Users,
  Building2,
  MapPin,
  Shield,
  Calendar,
  Layers,
} from 'lucide-react';

const MILITARY_ROLE_LABELS: Record<string, string> = {
  PLATOON_COMMANDER: 'מפקד פלוגה',
  SERGEANT_MAJOR: 'סמ"פ',
  OPERATIONS_SGT: 'קמב"צ',
  OPERATIONS_NCO: 'סמב"צ',
  DUTY_OFFICER: 'מ"מ',
  SQUAD_COMMANDER: 'מפקד',
  FIGHTER: 'לוחם',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'מנהל',
  OFFICER: 'קצין',
  LOGISTICS: 'לוגיסטיקה',
  COMMANDER: 'מפקד',
  SOLDIER: 'חייל',
};

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const { data: company, isLoading } = useQuery({
    queryKey: ['battalion-company', companyId],
    queryFn: async () => {
      const res = await api.get(`/battalion-dashboard/company/${companyId}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <BattalionLayout>
        <div className="flex justify-center py-12"><Spinner /></div>
      </BattalionLayout>
    );
  }

  if (!company) {
    return (
      <BattalionLayout>
        <Card className="p-8 text-center text-gray-400">פלוגה לא נמצאה</Card>
      </BattalionLayout>
    );
  }

  // Group users by military role
  const roleGroups: Record<string, any[]> = {};
  (company.users || []).forEach((u: any) => {
    const role = u.militaryRole || 'FIGHTER';
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(u);
  });

  return (
    <BattalionLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          {company.description && (
            <p className="text-gray-500 mt-1">{company.description}</p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">{company._count?.users || 0}</div>
            <div className="text-xs text-gray-500">חיילים</div>
          </Card>
          <Card className="p-4 text-center">
            <Building2 className="w-6 h-6 mx-auto mb-1 text-military-600" />
            <div className="text-2xl font-bold text-military-700">{company._count?.departments || 0}</div>
            <div className="text-xs text-gray-500">מחלקות</div>
          </Card>
          <Card className="p-4 text-center">
            <MapPin className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-700">{company._count?.zones || 0}</div>
            <div className="text-xs text-gray-500">אזורים</div>
          </Card>
          <Card className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-1 text-orange-600" />
            <div className="text-2xl font-bold text-orange-700">
              {company.activeCycle ? 1 : 0}
            </div>
            <div className="text-xs text-gray-500">סבב פעיל</div>
          </Card>
        </div>

        {/* Active Service Cycle */}
        {company.activeCycle && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold">סבב מילואים פעיל</h2>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">פעיל</span>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{company.activeCycle.name}</span>
              {company.activeCycle.location && (
                <span className="mr-2 text-gray-400">({company.activeCycle.location})</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(company.activeCycle.startDate).toLocaleDateString('he-IL')}
              {company.activeCycle.endDate && (
                <> - {new Date(company.activeCycle.endDate).toLocaleDateString('he-IL')}</>
              )}
              {' '}&bull; {company.activeCycle._count?.attendances || 0} חיילים
            </div>
          </Card>
        )}

        {/* Departments */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-military-600" />
            <h2 className="font-semibold">מחלקות</h2>
          </div>
          {company.departments?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {company.departments.map((dept: any) => (
                <div key={dept.id} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="font-medium text-sm">{dept.name}</div>
                  <div className="text-xs text-gray-400">קוד: {dept.code}</div>
                  <div className="text-lg font-bold text-military-700 mt-1">{dept._count?.users || 0}</div>
                  <div className="text-xs text-gray-500">חיילים</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">אין מחלקות</p>
          )}
        </Card>

        {/* Zones & Tasks */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold">אזורים ומשימות</h2>
          </div>
          {company.zones?.length > 0 ? (
            <div className="space-y-3">
              {company.zones.map((zone: any) => (
                <div key={zone.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm mb-1">
                    <MapPin className="w-4 h-4 inline ml-1 text-green-600" />
                    {zone.name}
                    {zone.description && (
                      <span className="text-gray-400 text-xs mr-2">— {zone.description}</span>
                    )}
                  </div>
                  {zone.tasks?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {zone.tasks.map((task: any) => (
                        <span
                          key={task.id}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600"
                        >
                          {task.name}
                          <span className="text-gray-300 mr-1">({task.requiredPeopleCount})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">אין אזורים</p>
          )}
        </Card>

        {/* Users by Role */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">חיילים ({company.users?.length || 0})</h2>
          </div>
          {Object.entries(roleGroups).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(roleGroups).map(([role, users]) => (
                <div key={role}>
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    {MILITARY_ROLE_LABELS[role] || role} ({users.length})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {users.map((user: any) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 rounded px-3 py-2 flex justify-between items-center text-sm"
                      >
                        <span>{user.fullName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                          {user.department && (
                            <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                              {user.department.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">אין חיילים</p>
          )}
        </Card>
      </div>
    </BattalionLayout>
  );
}
