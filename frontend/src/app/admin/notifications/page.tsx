'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';

export default function AdminNotificationsPage() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/admin/notifications/broadcast', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההתראה נשלחה לכל המשתמשים בהצלחה');
      setFormData({ title: '', content: '' });
    },
    onError: () => {
      toast.error('שגיאה בשליחת ההתראה');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error('נא למלא את כל השדות');
      return;
    }

    broadcastMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">שליחת התראות מערכת</h1>
        <p className="text-gray-600 mt-1">שלח התראה לכל המשתמשים במערכת</p>
      </div>

      <Card>
        <CardHeader>
          <span>התראה חדשה</span>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <Input
              label="כותרת"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="לדוגמה: עדכון חשוב"
              required
            />

            <div>
              <label className="label">תוכן ההתראה</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="input min-h-[120px] resize-none"
                placeholder="תוכן ההתראה שיוצג למשתמשים..."
                rows={4}
                required
              />
            </div>

            <Button
              type="submit"
              isLoading={broadcastMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 ml-2" />
              שלח לכל המשתמשים
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <span>הסבר</span>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• ההתראה תישלח לכל המשתמשים הרשומים במערכת</li>
            <li>• ההתראה תופיע בקטגוריית "התראות מערכת" בדף הראשי</li>
            <li>• משתמשים יוכלו לסמן את ההתראה כנקראה</li>
          </ul>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
