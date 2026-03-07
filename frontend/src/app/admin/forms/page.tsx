'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  FormSubmission,
  FormStatus,
  FORM_TYPE_LABELS,
  FORM_STATUS_LABELS,
} from '@/types';
import { formatDateTime, getStatusColor, cn } from '@/lib/utils';

export default function AdminFormsPage() {
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [filter, setFilter] = useState<FormStatus | 'ALL'>('ALL');
  const queryClient = useQueryClient();

  const { data: forms, isLoading } = useQuery<FormSubmission[]>({
    queryKey: ['admin-forms'],
    queryFn: async () => {
      const response = await api.get('/admin/forms');
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      comment,
    }: {
      id: string;
      status: FormStatus;
      comment?: string;
    }) => {
      const response = await api.patch(`/admin/forms/${id}`, {
        status,
        adminComment: comment,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הסטטוס עודכן בהצלחה');
      setSelectedForm(null);
      setAdminComment('');
      queryClient.invalidateQueries({ queryKey: ['admin-forms'] });
    },
    onError: () => {
      toast.error('שגיאה בעדכון הסטטוס');
    },
  });

  const handleStatusUpdate = (status: FormStatus) => {
    if (!selectedForm) return;
    updateStatusMutation.mutate({
      id: selectedForm.id,
      status,
      comment: adminComment,
    });
  };

  const filteredForms = forms?.filter(
    (form) => filter === 'ALL' || form.status === filter
  );

  const getStatusBadgeVariant = (status: FormStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול טפסים</h1>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as FormStatus | 'ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === status
                  ? 'bg-military-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              {status === 'ALL' ? 'הכל' : FORM_STATUS_LABELS[status as FormStatus]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : filteredForms && filteredForms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      סוג הטופס
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      מגיש
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      סטטוס
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      תאריך הגשה
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForms.map((form) => (
                    <tr key={form.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {FORM_TYPE_LABELS[form.type]}
                      </td>
                      <td className="px-4 py-3">
                        <p>{form.user?.fullName}</p>
                        <p className="text-sm text-gray-500">{form.user?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(form.status)}>
                          {FORM_STATUS_LABELS[form.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(form.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedForm(form);
                            setAdminComment(form.adminComment || '');
                          }}
                          className="p-2 text-military-600 hover:bg-military-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין טפסים</p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedForm}
        onClose={() => {
          setSelectedForm(null);
          setAdminComment('');
        }}
        title={selectedForm ? FORM_TYPE_LABELS[selectedForm.type] : ''}
        size="lg"
      >
        {selectedForm && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">מגיש הבקשה</p>
                  <p className="font-medium">{selectedForm.user?.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">טלפון</p>
                  <p className="font-medium">{selectedForm.user?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">אימייל</p>
                  <p className="font-medium">{selectedForm.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">תאריך הגשה</p>
                  <p className="font-medium">
                    {formatDateTime(selectedForm.createdAt)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">תוכן הבקשה</p>
                <div className="bg-white p-3 rounded border">
                  {typeof selectedForm.content === 'object' ? (
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedForm.content, null, 2)}
                    </pre>
                  ) : (
                    <p>{String(selectedForm.content)}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500 mb-2">סטטוס נוכחי</p>
                <Badge variant={getStatusBadgeVariant(selectedForm.status)}>
                  {FORM_STATUS_LABELS[selectedForm.status]}
                </Badge>
              </div>
            </div>

            {selectedForm.status === 'PENDING' && (
              <>
                <div>
                  <label className="label flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    הערת מפקד (אופציונלי)
                  </label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    className="input min-h-[80px] resize-none"
                    rows={3}
                    placeholder="הוסף הערה..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleStatusUpdate('APPROVED')}
                    isLoading={updateStatusMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    אשר בקשה
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('REJECTED')}
                    isLoading={updateStatusMutation.isPending}
                    variant="danger"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    דחה בקשה
                  </Button>
                </div>
              </>
            )}

            {selectedForm.adminComment && selectedForm.status !== 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800">הערת מפקד:</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {selectedForm.adminComment}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
