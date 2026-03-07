'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Message, PRIORITY_LABELS } from '@/types';
import { formatRelativeTime, getPriorityColor, cn } from '@/lib/utils';

export function MessagesSection() {
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await api.get('/messages');
      return response.data;
    },
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM':
        return <Megaphone className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <span>הודעות יומיות</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-3">
            {messages.slice(0, 5).map((message) => (
              <div
                key={message.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'p-1.5 rounded-full',
                      getPriorityColor(message.priority)
                    )}
                  >
                    {getPriorityIcon(message.priority)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{message.title}</h4>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          getPriorityColor(message.priority)
                        )}
                      >
                        {PRIORITY_LABELS[message.priority]}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                      {message.content}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {formatRelativeTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">אין הודעות</p>
        )}
      </CardContent>
    </Card>
  );
}
