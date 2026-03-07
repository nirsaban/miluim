'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Search, X, Check, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { MultiSelect } from '@/components/ui/MultiSelect';
import api from '@/lib/api';
import { SoldierWithSkills, Skill, ROLE_LABELS, UserRole } from '@/types';

export default function AdminSoldiersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const response = await api.patch(`/users/${id}/role`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soldiers-with-skills'] });
      toast.success('תפקיד עודכן בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בעדכון תפקיד');
    },
  });

  const filteredSoldiers = soldiers?.filter((soldier) => {
    const matchesSearch =
      soldier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      soldier.armyNumber.includes(searchTerm) ||
      soldier.phone.includes(searchTerm);
    return matchesSearch;
  });

  const startEditing = (soldier: SoldierWithSkills) => {
    setEditingId(soldier.id);
    setSelectedSkillIds(soldier.skills?.map((s) => s.skillId) || []);
    setSelectedRole(soldier.role);
  };

  const handleSave = (soldierId: string) => {
    updateSkillsMutation.mutate({
      id: soldierId,
      skillIds: selectedSkillIds,
    });
  };

  const handleRoleChange = (soldierId: string, role: UserRole) => {
    updateRoleMutation.mutate({ id: soldierId, role });
  };

  const skillOptions = skills?.map((s) => ({ value: s.id, label: s.displayName })) || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול חיילים</h1>
        <p className="text-gray-600 mt-1">הקצה כישורים ותפקידים לחיילים</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>חיילים</span>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="חיפוש לפי שם, מ.א או טלפון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">שם</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">מספר אישי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">טלפון</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">תפקיד ראשי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">כישורים</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSoldiers?.map((soldier) => (
                    <tr key={soldier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-military-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-military-600" />
                          </div>
                          <span className="font-medium">{soldier.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{soldier.armyNumber}</td>
                      <td className="px-4 py-3 text-gray-600 ltr">{soldier.phone}</td>
                      <td className="px-4 py-3">
                        {editingId === soldier.id ? (
                          <Select
                            value={selectedRole}
                            onChange={(e) => {
                              const newRole = e.target.value as UserRole;
                              setSelectedRole(newRole);
                              handleRoleChange(soldier.id, newRole);
                            }}
                            options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                              value,
                              label,
                            }))}
                            className="w-32"
                          />
                        ) : (
                          <span className="px-2 py-1 text-xs bg-military-100 text-military-700 rounded">
                            {ROLE_LABELS[soldier.role]}
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
                                  className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {s.skill?.displayName}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">ללא כישורים</span>
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
                                setSelectedRole('');
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(soldier)}
                            className="p-2 text-gray-500 hover:text-military-600 hover:bg-gray-100 rounded"
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
