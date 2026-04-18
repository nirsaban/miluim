'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { queryKeys } from '@/lib/queryKeys';

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/companies', {
        name,
        code,
        description: description || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('פלוגה נוצרה בהצלחה');
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      router.push('/battalion/companies');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה ביצירת פלוגה');
    },
  });

  return (
    <BattalionLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">יצירת פלוגה חדשה</h1>

        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם פלוגה</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='לדוגמה: פלוגה א&apos;'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קוד</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="לדוגמה: A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור (אופציונלי)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !code || createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? 'יוצר...' : 'יצירת פלוגה'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              ביטול
            </Button>
          </div>
        </Card>
      </div>
    </BattalionLayout>
  );
}
