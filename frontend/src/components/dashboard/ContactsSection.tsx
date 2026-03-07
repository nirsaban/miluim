'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Phone, Mail } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Contact, ROLE_LABELS } from '@/types';

export function ContactsSection() {
  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await api.get('/users/contacts');
      return response.data;
    },
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <span>אנשי קשר חשובים</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : contacts && contacts.length > 0 ? (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium">{contact.fullName}</p>
                  <p className="text-sm text-military-600">
                    {ROLE_LABELS[contact.role]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${contact.phone}`}
                    className="p-2 bg-military-100 text-military-700 rounded-full hover:bg-military-200 transition-colors"
                    title="התקשר"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:${contact.email}`}
                    className="p-2 bg-military-100 text-military-700 rounded-full hover:bg-military-200 transition-colors"
                    title="שלח מייל"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">אין אנשי קשר</p>
        )}
      </CardContent>
    </Card>
  );
}
