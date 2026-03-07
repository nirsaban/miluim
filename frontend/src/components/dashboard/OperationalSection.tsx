'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crosshair, ExternalLink, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { OperationalLink, Message } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export function OperationalSection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
  });

  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'OFFICER' ||
    user?.role === 'LOGISTICS';

  const { data: links, isLoading } = useQuery<OperationalLink[]>({
    queryKey: ['operational-links'],
    queryFn: async () => {
      const response = await api.get('/operational-links');
      return response.data;
    },
  });

  const { data: operationalMessages } = useQuery<Message[]>({
    queryKey: ['operational-messages'],
    queryFn: async () => {
      const response = await api.get('/messages/operational');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/operational-links', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הקישור נוסף בהצלחה');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['operational-links'] });
    },
    onError: () => {
      toast.error('שגיאה בהוספת הקישור');
    },
  });

  const openModal = () => {
    setFormData({ title: '', description: '', url: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ title: '', description: '', url: '' });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.url) {
      toast.error('נא למלא כותרת וקישור');
      return;
    }

    // Basic URL validation
    if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      toast.error('נא להזין קישור תקין (מתחיל ב-http:// או https://)');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <>
      <Card id="operational">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5" />
            <span>מבצעי - דוחות משימה</span>
          </div>
          {canManage && (
            <Button variant="ghost" size="sm" onClick={openModal}>
              <Plus className="w-4 h-4 ml-1" />
              הוסף קישור
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : links && links.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-200 hover:bg-military-50 hover:border-military-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm flex items-center gap-2">
                        {link.title}
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </p>
                      {link.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">אין קישורים מבצעיים</p>
          )}

          {/* Scrolling Banner for Operational Messages */}
          {operationalMessages && operationalMessages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="overflow-hidden bg-military-50 rounded-lg py-2">
                <div className="animate-marquee whitespace-nowrap">
                  {operationalMessages.map((message, index) => (
                    <span key={message.id} className="inline-block px-4 text-sm text-military-700">
                      <span className="font-bold">{message.title}:</span> {message.content}
                      {index < operationalMessages.length - 1 && (
                        <span className="mx-4 text-military-400">•</span>
                      )}
                    </span>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {operationalMessages.map((message, index) => (
                    <span key={`dup-${message.id}`} className="inline-block px-4 text-sm text-military-700">
                      <span className="font-bold">{message.title}:</span> {message.content}
                      {index < operationalMessages.length - 1 && (
                        <span className="mx-4 text-military-400">•</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="הוספת קישור מבצעי"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="כותרת"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="לדוגמה: דוח ציוד ורכב"
            required
          />

          <Input
            label="תיאור (אופציונלי)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="תיאור קצר של הקישור"
          />

          <Input
            label="קישור"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://forms.google.com/..."
            required
            dir="ltr"
          />

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending}
              className="flex-1"
            >
              הוסף קישור
            </Button>
            <Button variant="secondary" onClick={closeModal}>
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
