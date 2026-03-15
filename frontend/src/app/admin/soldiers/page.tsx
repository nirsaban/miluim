'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Search, X, Check, User, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { MultiSelect } from '@/components/ui/MultiSelect';
import api from '@/lib/api';
import { SoldierWithSkills, Skill, MilitaryRole, MILITARY_ROLE_LABELS, Department } from '@/types';

export default function AdminSoldiersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMilitaryRole, setSelectedMilitaryRole] = useState<MilitaryRole | ''>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  // Filter states
  const [filterRole, setFilterRole] = useState<MilitaryRole | ''>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: soldiers, isLoading } = useQuery<SoldierWithSkills[]>({
    queryKey: ['soldiers-with-skills'],
    queryFn: async () => {
      const response = await api.get('/users/admin/soldiers');
      return response.data;
    },
  });

  const { data: skills } = useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const response = await api.get('/skills');
      return response.data;
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/users/admin/departments');
      return response.data;
    },
  });

  const updateSkillsMutation = useMutation({
    mutationFn: async ({ id, skillIds }: { id: string; skillIds: string[] }) => {
      const response = await api.put(`/users/${id}/skills`, { skillIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soldiers-with-skills'] });
      toast.success('כישורים עודכנו בהצלחה');
      setEditingId(null);
      setSelectedSkillIds([]);
    },
    onError: () => {
      toast.error('שגיאה בעדכון כישורים');
    },
  });

  const updateMilitaryRoleMutation = useMutation({
    mutationFn: async ({ id, militaryRole }: { id: string; militaryRole: MilitaryRole }) => {
      const response = await api.patch(`/users/${id}/military-role`, { militaryRole });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soldiers-with-skills'] });
      toast.success('תפקיד צבאי עודכן בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון תפקיד צבאי');
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, departmentId }: { id: string; departmentId: string }) => {
      const response = await api.patch(`/users/${id}/department`, { departmentId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soldiers-with-skills'] });
      toast.success('מחלקה עודכנה בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון מחלקה');
    },
  });

  const filteredSoldiers = soldiers?.filter((soldier) => {
    const matchesSearch =
      soldier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      soldier.armyNumber.includes(searchTerm) ||
      soldier.phone.includes(searchTerm);

    const matchesRole = !filterRole || soldier.militaryRole === filterRole;
    const matchesDepartment = !filterDepartment || soldier.departmentId === filterDepartment;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const startEditing = (soldier: SoldierWithSkills) => {
    setEditingId(soldier.id);
    setSelectedSkillIds(soldier.skills?.map((s) => s.skillId) || []);
    setSelectedMilitaryRole(soldier.militaryRole || 'FIGHTER');
    setSelectedDepartmentId(soldier.departmentId || '');
  };

  const handleDepartmentChange = (soldierId: string, departmentId: string) => {
    updateDepartmentMutation.mutate({ id: soldierId, departmentId });
  };

  const handleSave = (soldierId: string) => {
    updateSkillsMutation.mutate({
      id: soldierId,
      skillIds: selectedSkillIds,
    });
  };

  const handleMilitaryRoleChange = (soldierId: string, militaryRole: MilitaryRole) => {
    updateMilitaryRoleMutation.mutate({ id: soldierId, militaryRole });
  };

  const skillOptions = skills?.map((s) => ({ value: s.id, label: s.displayName })) || [];
  const departmentOptions = departments?.map((d) => ({ value: d.id, label: d.name })) || [];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול חיילים</h1>
        <p className="text-gray-600 mt-1">הקצה כישורים ותפקידים לחיילים</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>חיילים</span>
              <span className="text-sm text-gray-600">({filteredSoldiers?.length || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="חיפוש לפי שם, מ.א או טלפון..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Button
                variant={showFilters ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">תפקיד:</span>
                <Select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as MilitaryRole | '')}
                  options={[
                    { value: '', label: 'הכל' },
                    ...Object.entries(MILITARY_ROLE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  ]}
                  className="w-32"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">מחלקה:</span>
                <Select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  options={[
                    { value: '', label: 'הכל' },
                    ...departmentOptions,
                  ]}
                  className="w-32"
                />
              </div>
              {(filterRole || filterDepartment) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilterRole('');
                    setFilterDepartment('');
                  }}
                >
                  נקה סינון
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">שם</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מספר אישי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">טלפון</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מחלקה</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">תפקיד ראשי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">כישורים</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSoldiers?.map((soldier) => (
                    <tr key={soldier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-military-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-military-700" />
                          </div>
                          <span className="font-medium text-gray-900">{soldier.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{soldier.armyNumber}</td>
                      <td className="px-4 py-3 text-gray-600 ltr">{soldier.phone}</td>
                      <td className="px-4 py-3">
                        {editingId === soldier.id ? (
                          <Select
                            value={selectedDepartmentId}
                            onChange={(e) => {
                              const newDepartmentId = e.target.value;
                              setSelectedDepartmentId(newDepartmentId);
                              if (newDepartmentId) {
                                handleDepartmentChange(soldier.id, newDepartmentId);
                              }
                            }}
                            options={[
                              { value: '', label: 'בחר מחלקה' },
                              ...departmentOptions,
                            ]}
                            className="w-32"
                          />
                        ) : (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg font-medium">
                            {soldier.department?.name || 'לא הוגדר'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === soldier.id ? (
                          <Select
                            value={selectedMilitaryRole}
                            onChange={(e) => {
                              const newRole = e.target.value as MilitaryRole;
                              setSelectedMilitaryRole(newRole);
                              handleMilitaryRoleChange(soldier.id, newRole);
                            }}
                            options={Object.entries(MILITARY_ROLE_LABELS).map(([value, label]) => ({
                              value,
                              label,
                            }))}
                            className="w-32"
                          />
                        ) : (
                          <span className="px-2 py-1 text-xs bg-military-100 text-military-700 rounded-lg font-medium">
                            {soldier.militaryRole ? MILITARY_ROLE_LABELS[soldier.militaryRole] : 'לא הוגדר'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === soldier.id ? (
                          <MultiSelect
                            options={skillOptions}
                            value={selectedSkillIds}
                            onChange={setSelectedSkillIds}
                            placeholder="בחר כישורים..."
                            className="w-64"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {soldier.skills?.length > 0 ? (
                              soldier.skills.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-lg"
                                >
                                  {s.skill?.displayName}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-sm">ללא כישורים</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === soldier.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSave(soldier.id)}
                              isLoading={updateSkillsMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditingId(null);
                                setSelectedSkillIds([]);
                                setSelectedMilitaryRole('');
                                setSelectedDepartmentId('');
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(soldier)}
                            className="p-2 text-gray-600 hover:text-military-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSoldiers?.length === 0 && (
                <p className="text-center text-gray-500 py-8">לא נמצאו חיילים</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
