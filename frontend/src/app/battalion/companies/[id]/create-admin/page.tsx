'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BattalionLayout } from '@/components/layout/BattalionLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import toast from 'react-hot-toast';
import { Company } from '@/types';

export default function CreateCompanyAdminPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const { data: company } = useQuery<Company>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const res = await api.get(`/companies/${companyId}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/companies/${companyId}/initial-admin`, {
        fullName,
        email,
        phone,
        personalId,
        idNumber,
        temporaryPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`מנהל נוצר בהצלחה: ${data.fullName}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.companies });
      router.push('/battalion/companies');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה ביצירת מנהל');
    },
  });

  const isValid = fullName && email && phone && personalId && idNumber && temporaryPassword.length >= 6;

  return (
    <BattalionLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">יצירת מנהל לפלוגה</h1>
          {company && (
            <p className="text-gray-500 mt-1">
              {company.name} ({company.code})
            </p>
          )}
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר אישי</label>
            <Input value={personalId} onChange={(e) => setPersonalId(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תעודת זהות</label>
            <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה זמנית</label>
            <Input
              type="password"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              placeholder="מינימום 6 תווים"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!isValid || createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? 'יוצר...' : 'יצירת מנהל'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              ביטול
            </Button>
          </div>
        </Card>
      </div>
    </BattalionLayout>
  );
}
