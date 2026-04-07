'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function AdminReportsPage() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    taskId: '',
    zoneId: '',
    eventNumber: '',
  });

  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ['admin-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.taskId) params.append('taskId', filters.taskId);
      if (filters.zoneId) params.append('zoneId', filters.zoneId);
      if (filters.eventNumber) params.append('eventNumber', filters.eventNumber);
      
      const response = await api.get(`/shift-reports?${params.toString()}`);
      return response.data;
    },
  });

  const { data: zones } = useQuery<any[]>({
    queryKey: ['zones'],
    queryFn: async () => {
      const response = await api.get('/zones');
      return response.data;
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['users-list'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const handleExport = async (id: string, eventNumber: string, date: string) => {
    try {
      const response = await api.get(`/shift-reports/${id}/export`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${eventNumber || 'summary'}-${date}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed', error);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">דוחות וסיכומי אירועים</h1>
        <p className="text-gray-600 mt-1">צפייה, סינון וייצוא של דוחות משמרת</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2 text-sm font-bold bg-gray-50">
          <Filter className="w-4 h-4" />
          <span>סינון דוחות</span>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">מתאריך</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">עד תאריך</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">מדווח</label>
              <Select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                options={[
                  { value: '', label: 'כל המדווחים' },
                  ...(users?.map(u => ({ value: u.id, label: u.fullName })) || [])
                ]}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">אזור</label>
              <Select
                value={filters.zoneId}
                onChange={(e) => setFilters({ ...filters, zoneId: e.target.value })}
                options={[
                  { value: '', label: 'כל האזורים' },
                  ...(zones?.map(z => ({ value: z.id, label: z.name })) || [])
                ]}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">מספר אירוע</label>
              <Input
                placeholder="חפש מספר..."
                value={filters.eventNumber}
                onChange={(e) => setFilters({ ...filters, eventNumber: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full h-9"
                onClick={() => setFilters({
                  startDate: '',
                  endDate: '',
                  userId: '',
                  taskId: '',
                  zoneId: '',
                  eventNumber: '',
                })}
              >
                נקה סינון
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-bold text-gray-700">תאריך</th>
                    <th className="px-4 py-3 text-sm font-bold text-gray-700">כותרת</th>
                    <th className="px-4 py-3 text-sm font-bold text-gray-700">מדווח</th>
                    <th className="px-4 py-3 text-sm font-bold text-gray-700">משימה / אזור</th>
                    <th className="px-4 py-3 text-sm font-bold text-gray-700">מס׳ אירוע</th>
                    <th className="px-4 py-3 text-sm font-bold text-gray-700 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(report.reportDate, 'dd/MM/yyyy')} {report.reportTime && `• ${report.reportTime}`}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{report.reportTitle}</td>
                      <td className="px-4 py-3 text-sm">{report.user.fullName}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <span>{report.shiftAssignment.task.name}</span>
                          <span className="text-xs text-gray-400">{report.shiftAssignment.task.zone?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {report.eventNumber ? <Badge variant="outline">{report.eventNumber}</Badge> : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedReport(report)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="צפה בפרטים"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleExport(report.id, report.eventNumber, formatDate(report.reportDate, 'yyyy-MM-dd'))}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                            title="ייצא ל-Word"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        לא נמצאו דוחות התואמים את הסינון
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report View Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.reportTitle || 'פרטי דו״ח'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">מדווח</span>
              <span className="font-bold">{selectedReport?.user.fullName} ({selectedReport?.user.personalId})</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">תאריך ושעה</span>
              <span className="font-bold">
                {selectedReport && formatDate(selectedReport.reportDate, 'dd/MM/yyyy')} {selectedReport?.reportTime && `• ${selectedReport.reportTime}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-gray-500 block">אזור</span>
              <span className="text-sm">{selectedReport?.shiftAssignment.task.zone?.name || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">משימה</span>
              <span className="text-sm">{selectedReport?.shiftAssignment.task.name || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">סד״כ</span>
              <span className="text-sm">{selectedReport?.forceComposition || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">רכב</span>
              <span className="text-sm">{selectedReport?.vehicleNumber || '-'}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase">תוכן הדיווח</h4>
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {selectedReport?.content}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-100 p-3 rounded-lg">
              <span className="text-xs text-gray-500 block mb-1">אמצעים ששימשו</span>
              <span className="text-sm italic">{selectedReport?.meansUsed || 'ללא'}</span>
            </div>
            <div className="border border-gray-100 p-3 rounded-lg">
              <span className="text-xs text-gray-500 block mb-1">סיום / תוצאה</span>
              <span className="text-sm italic">{selectedReport?.closingResult || 'ללא חריגים'}</span>
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-3">
            <Button
              variant="secondary"
              onClick={() => handleExport(selectedReport.id, selectedReport.eventNumber, formatDate(selectedReport.reportDate, 'yyyy-MM-dd'))}
            >
              <Download className="w-4 h-4 ml-2" />
              ייצא ל-Word
            </Button>
            <Button onClick={() => setSelectedReport(null)}>סגור</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
