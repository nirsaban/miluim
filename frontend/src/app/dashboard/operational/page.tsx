'use client';

import { useQuery } from '@tanstack/react-query';
import { Shield, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { OperationalLink } from '@/types';

export default function OperationalPage() {
  const { data: links, isLoading } = useQuery<OperationalLink[]>({
    queryKey: ['operational-links'],
    queryFn: async () => {
      const response = await api.get('/operational-links');
      return response.data;
    },
  });

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">מבצעי</h1>
        <p className="text-gray-600 mt-1">קישורים ומסמכים מבצעיים</p>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">קישורים מבצעיים</p>
              <p className="mt-1">
                כאן תמצאו קישורים חשובים למערכות, מסמכים והנחיות מבצעיות.
                הקישורים מתעדכנים על ידי הפיקוד.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Links */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-military-600" />
          <span>קישורים מבצעיים</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : links && links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-military-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-military-100 rounded-lg flex items-center justify-center group-hover:bg-military-200 transition-colors">
                      <FileText className="w-5 h-5 text-military-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 group-hover:text-military-700">
                        {link.title}
                      </div>
                      {link.description && (
                        <div className="text-sm text-gray-500">{link.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        נוסף על ידי {link.createdBy.fullName} • {formatRelativeTime(link.createdAt)}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-military-600 transition-colors" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">אין קישורים מבצעיים זמינים כרגע</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future: Mission Reports Placeholder */}
      <Card className="mt-6">
        <CardHeader className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <span className="text-gray-600">דוחות משימה</span>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">מודול דוחות משימה יהיה זמין בקרוב</p>
          </div>
        </CardContent>
      </Card>
    </UserLayout>
  );
}
