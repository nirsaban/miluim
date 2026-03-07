'use client';

import { useQuery } from '@tanstack/react-query';
import { Utensils } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Message } from '@/types';

export function FoodSection() {
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['food-messages'],
    queryFn: async () => {
      const response = await api.get('/messages/food');
      return response.data;
    },
  });

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Utensils className="w-5 h-5" />
        <span>תפעול מזון</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-military-50 rounded-lg border border-military-200">
              <h4 className="font-bold text-sm text-military-700 mb-2">
                הזמנת מזון - מערכת סייבוס
              </h4>
              <p className="text-sm text-gray-600">
                נא להזמין ארוחות מראש דרך מערכת הסייבוס.
                <br />
                יש להזמין עד 24 שעות לפני הארוחה.
              </p>
            </div>

            {messages && messages.length > 0 ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h4 className="font-bold text-sm">{message.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-2">
                אין הודעות מזון נוספות
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
