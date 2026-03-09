'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check, X, UserPlus, UserCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { MilitaryRole, MILITARY_ROLE_LABELS, Department } from '@/types';

interface PreapprovedUser {
  id: string;
  personalId: string;
  fullName: string;
  militaryRole: MilitaryRole;
  department: Department | null;
  isPreApproved: boolean;
  isRegistered: boolean;
  createdAt: string;
}

interface CreatePreapprovedUserForm {
  personalId: string;
  fullName: string;
  militaryRole: MilitaryRole | '';
  departmentId: string;
  phone: string;
}

const MILITARY_ROLE_OPTIONS = Object.entries(MILITARY_ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function AdminPreapprovedUsersPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<CreatePreapprovedUserForm>({
    personalId: '',
    fullName: '',
    militaryRole: '',
    departmentId: '',
    phone: '',
  });

  const { data: users, isLoading } = useQuery<PreapprovedUser[]>({
    queryKey: ['preapproved-users'],
    queryFn: async () => {
      const response = await api.get('/users/admin/preapproved');
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

  const createMutation = useMutation({
    mutationFn: async (data: CreatePreapprovedUserForm) => {
      const response = await api.post('/users/admin/preapproved', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preapproved-users'] });
      toast.success('משתמש נוסף בהצלחה');
      setIsAdding(false);
      setFormData({
        personalId: '',
        fullName: '',
        militaryRole: '',
        departmentId: '',
        phone: '',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה בהוספת משתמש';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/admin/preapproved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preapproved-users'] });
      toast.success('משתמש הוסר בהצלחה');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'שגיאה בהסרת משתמש';
      toast.error(message);
    },
  });

  const handleCreate = () => {
    if (!formData.personalId || !formData.fullName || !formData.militaryRole || !formData.departmentId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }
    createMutation.mutate(formData);
  };

  const departmentOptions = departments?.map((d) => ({
    value: d.id,
    label: d.name,
  })) || [];

  // Separate users into registered and not registered
  const registeredUsers = users?.filter((u) => u.isRegistered) || [];
  const pendingUsers = users?.filter((u) => !u.isRegistered) || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">ניהול משתמשים מאושרים מראש</h1>
        <p className="text-gray-600 mt-1">הוסף קצינים וחיילים למערכת לפני שהם משלימים הרשמה</p>
      </div>

      {/* Add New User */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-military-600" />
            <span>הוספת משתמש חדש</span>
          </div>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 ml-1" />
              משתמש חדש
            </Button>
          )}
        </CardHeader>
        {isAdding && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="מספר אישי"
                placeholder="1234567"
                value={formData.personalId}
                onChange={(e) => setFormData({ ...formData, personalId: e.target.value })}
                required
              />
              <Input
                label="שם מלא"
                placeholder="ישראל ישראלי"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              <Select
                label="תפקיד צבאי"
                value={formData.militaryRole}
                onChange={(e) => setFormData({ ...formData, militaryRole: e.target.value as MilitaryRole })}
                options={[{ value: '', label: 'בחר תפקיד...' }, ...MILITARY_ROLE_OPTIONS]}
                required
              />
              <Select
                label="מחלקה"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                options={[{ value: '', label: 'בחר מחלקה...' }, ...departmentOptions]}
                required
              />
              <Input
                label="טלפון (אופציונלי)"
                placeholder="0501234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAdding(false);
                  setFormData({
                    personalId: '',
                    fullName: '',
                    militaryRole: '',
                    departmentId: '',
                    phone: '',
                  });
                }}
              >
                <X className="w-4 h-4 ml-1" />
                ביטול
              </Button>
              <Button onClick={handleCreate} isLoading={createMutation.isPending}>
                <Check className="w-4 h-4 ml-1" />
                הוסף משתמש
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending Users (Not Yet Registered) */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span>ממתינים להשלמת הרשמה</span>
            <span className="text-sm text-gray-500">({pendingUsers.length})</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : pendingUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין משתמשים ממתינים</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מספר אישי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">שם מלא</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">תפקיד</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מחלקה</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">נוסף בתאריך</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{user.personalId}</td>
                      <td className="px-4 py-3 font-medium">{user.fullName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-military-100 text-military-700 rounded-lg">
                          {MILITARY_ROLE_LABELS[user.militaryRole]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.department?.name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {new Date(user.createdAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="מחק משתמש"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <span>משתמשים רשומים</span>
            <span className="text-sm text-gray-500">({registeredUsers.length})</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : registeredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">אין משתמשים רשומים</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מספר אישי</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">שם מלא</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">תפקיד</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">מחלקה</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {registeredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{user.personalId}</td>
                      <td className="px-4 py-3 font-medium">{user.fullName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-military-100 text-military-700 rounded-lg">
                          {MILITARY_ROLE_LABELS[user.militaryRole]}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.department?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg">
                          רשום
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
