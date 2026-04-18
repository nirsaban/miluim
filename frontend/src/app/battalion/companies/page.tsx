'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import Link from 'next/link';
import { Plus, Building2, Users, Settings, Edit2, Check, X } from 'lucide-react';
import { Company } from '@/types';
import toast from 'react-hot-toast';

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: queryKeys.companies,
    queryFn: async () => {
      const res = await api.get('/companies');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const res = await api.patch(`/companies/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      toast.success('פלוגה עודכנה בהצלחה');
      setEditingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון');
    },
  });

  const startEditing = (company: Company) => {
    setEditingId(company.id);
    setEditName(company.name);
    setEditDescription(company.description || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEditing = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate({
      id,
      data: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      },
    });
  };

  return (
    <BattalionLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ניהול פלוגות</h1>
          <Link href="/battalion/companies/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              פלוגה חדשה
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies?.map((company) => (
              <Card key={company.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-military-100 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-military-600" />
                    </div>
                    {editingId === company.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="שם פלוגה"
                          className="text-sm"
                        />
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="תיאור (אופציונלי)"
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        <span className="text-sm text-gray-400">קוד: {company.code}</span>
                      </div>
                    )}
                  </div>
                  {editingId === company.id ? (
                    <div className="flex gap-1 mr-2">
                      <button
                        onClick={() => saveEditing(company.id)}
                        disabled={updateMutation.isPending}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(company)}
                      className="p-1.5 text-gray-400 hover:text-military-600 hover:bg-gray-100 rounded"
                      title="עריכת שם"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {editingId !== company.id && company.description && (
                  <p className="text-sm text-gray-500 mb-3">{company.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {company._count?.users || 0} חיילים
                  </div>
                  <div>
                    {company._count?.departments || 0} מחלקות
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/battalion/companies/${company.id}/create-admin`} className="flex-1">
                    <Button variant="outline" className="w-full text-sm">
                      <Settings className="w-3 h-3 ml-1" />
                      יצירת מנהל
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}

            {(!companies || companies.length === 0) && (
              <div className="col-span-full text-center py-12 text-gray-400">
                אין פלוגות עדיין. לחץ על &quot;פלוגה חדשה&quot; להוספה.
              </div>
            )}
          </div>
        )}
      </div>
    </BattalionLayout>
  );
}
