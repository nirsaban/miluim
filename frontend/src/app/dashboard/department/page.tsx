'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  LogOut,
  Phone,
  Search,
  Filter,
  Send,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import { MilitaryRole, MILITARY_ROLE_LABELS, isAdminMilitaryRole, MessageType, MessagePriority } from '@/types';
import { useAuth, useIsFullAdmin } from '@/hooks/useAuth';

interface DepartmentAnalytics {
  department: { id: string; name: string };
  totalSoldiers: number;
  attendanceStats: {
    arrived: number;
    notComing: number;
    pending: number;
    late: number;
  };
  activeLeaves: number;
  todayShifts: number;
  activeCycle: { id: string; name: string } | null;
}

interface SoldierWithStatus {
  id: string;
  fullName: string;
  phone: string;
  militaryRole: MilitaryRole;
  armyNumber: string;
  skills: Array<{ skill: { displayName: string } }>;
  activeLeave: {
    id: string;
    type: string;
    exitTime: string;
    expectedReturn: string;
  } | null;
  attendance: {
    attendanceStatus: string;
    checkInAt: string | null;
  } | null;
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  ARRIVED: 'הגיע',
  NOT_COMING: 'לא מגיע',
  PENDING: 'ממתין',
  LATE: 'איחור',
};

const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  ARRIVED: 'bg-green-100 text-green-700',
  NOT_COMING: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  LATE: 'bg-orange-100 text-orange-700',
};

export default function DepartmentPage() {
  const { user } = useAuth();
  const isFullAdmin = useIsFullAdmin();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('GENERAL');
  const [messagePriority, setMessagePriority] = useState<MessagePriority>('MEDIUM');

  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      type: MessageType;
      priority: MessagePriority;
    }) => {
      const response = await api.post('/messages/department', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההודעה נשלחה למחלקה בהצלחה');
      setShowMessageModal(false);
      resetMessageForm();
      queryClient.invalidateQueries({ queryKey: ['home-data'] });
    },
    onError: () => {
      toast.error('שגיאה בשליחת ההודעה');
    },
  });

  const resetMessageForm = () => {
    setMessageTitle('');
    setMessageContent('');
    setMessageType('GENERAL');
    setMessagePriority('MEDIUM');
  };

  const handleSendMessage = () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast.error('נא למלא כותרת ותוכן');
      return;
    }
    sendMessageMutation.mutate({
      title: messageTitle,
      content: messageContent,
      type: messageType,
      priority: messagePriority,
    });
  };

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery<DepartmentAnalytics>({
    queryKey: ['department-analytics'],
    queryFn: async () => {
      const response = await api.get('/users/department/analytics');
      return response.data;
    },
  });

  const { data: soldiers, isLoading: isLoadingSoldiers } = useQuery<SoldierWithStatus[]>({
    queryKey: ['department-soldiers'],
    queryFn: async () => {
      const response = await api.get('/users/department/soldiers-with-status');
      return response.data;
    },
  });

  const filteredSoldiers = soldiers?.filter((soldier) => {
    const matchesSearch =
      soldier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      soldier.armyNumber.includes(searchTerm) ||
      soldier.phone.includes(searchTerm);

    const matchesStatus = !filterStatus ||
      (filterStatus === 'ON_LEAVE' && soldier.activeLeave) ||
      (filterStatus === 'IN_BASE' && !soldier.activeLeave && soldier.attendance?.attendanceStatus === 'ARRIVED') ||
      (filterStatus !== 'ON_LEAVE' && filterStatus !== 'IN_BASE' && soldier.attendance?.attendanceStatus === filterStatus);

    return matchesSearch && matchesStatus;
  });

  // Check if user has appropriate role
  // Allowed: OFFICER, ADMIN, or admin-level military roles
  const hasAccess =
    user?.role === 'OFFICER' ||
    user?.role === 'ADMIN' ||
    isFullAdmin;

  if (!hasAccess) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">אין לך הרשאה לצפות בדף זה</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-military-700">המחלקה שלי</h1>
            <p className="text-gray-600 mt-1">
              {analytics?.department?.name || 'טוען...'}
              {analytics?.activeCycle && ` - ${analytics.activeCycle.name}`}
            </p>
          </div>
          <Button onClick={() => setShowMessageModal(true)}>
            <MessageSquare className="w-4 h-4 ml-2" />
            שלח הודעה למחלקה
          </Button>
        </div>

        {/* Analytics Cards */}
        {isLoadingAnalytics ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto text-military-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{analytics.totalSoldiers}</p>
                <p className="text-sm text-gray-600">סה״כ חיילים</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-700">{analytics.attendanceStats.arrived}</p>
                <p className="text-sm text-gray-600">הגיעו</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <LogOut className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                <p className="text-2xl font-bold text-orange-700">{analytics.activeLeaves}</p>
                <p className="text-sm text-gray-600">ביציאה</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-700">{analytics.todayShifts}</p>
                <p className="text-sm text-gray-600">משמרות היום</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Attendance Breakdown */}
        {analytics && (
          <Card>
            <CardHeader>סטטוס נוכחות</CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-sm">הגיעו: {analytics.attendanceStats.arrived}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-sm">לא מגיעים: {analytics.attendanceStats.notComing}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm">ממתינים: {analytics.attendanceStats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="text-sm">איחור: {analytics.attendanceStats.late}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Soldiers List */}
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span>חיילי המחלקה</span>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="חיפוש..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-9"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-colors ${
                    showFilters ? 'bg-military-100 text-military-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">סטטוס:</span>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  options={[
                    { value: '', label: 'הכל' },
                    { value: 'IN_BASE', label: 'בבסיס' },
                    { value: 'ON_LEAVE', label: 'ביציאה' },
                    { value: 'ARRIVED', label: 'הגיע' },
                    { value: 'NOT_COMING', label: 'לא מגיע' },
                    { value: 'PENDING', label: 'ממתין' },
                  ]}
                  className="w-32"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingSoldiers ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredSoldiers && filteredSoldiers.length > 0 ? (
              <div className="space-y-3">
                {filteredSoldiers.map((soldier) => (
                  <div
                    key={soldier.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-military-700" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{soldier.fullName}</p>
                        <p className="text-sm text-gray-500">
                          {MILITARY_ROLE_LABELS[soldier.militaryRole] || soldier.militaryRole}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status Badge */}
                      {soldier.activeLeave ? (
                        <Badge variant="warning">ביציאה</Badge>
                      ) : soldier.attendance ? (
                        <span className={`px-2 py-1 text-xs rounded-lg ${
                          ATTENDANCE_STATUS_COLORS[soldier.attendance.attendanceStatus] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {ATTENDANCE_STATUS_LABELS[soldier.attendance.attendanceStatus] || soldier.attendance.attendanceStatus}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg">
                          לא רשום
                        </span>
                      )}

                      {/* Phone */}
                      <a
                        href={`tel:${soldier.phone}`}
                        className="p-2 text-gray-500 hover:text-military-700 hover:bg-military-50 rounded-lg transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">לא נמצאו חיילים</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Message Modal */}
      <Modal
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          resetMessageForm();
        }}
        title="שלח הודעה למחלקה"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">כותרת</label>
            <Input
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="כותרת ההודעה..."
            />
          </div>

          <div>
            <label className="label">תוכן</label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="תוכן ההודעה..."
              className="input min-h-[100px] resize-none"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="סוג הודעה"
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as MessageType)}
              options={[
                { value: 'GENERAL', label: 'כללי' },
                { value: 'ANNOUNCEMENT', label: 'הכרזה' },
                { value: 'URGENT', label: 'דחוף' },
                { value: 'OPERATIONAL', label: 'מבצעי' },
              ]}
            />
            <Select
              label="עדיפות"
              value={messagePriority}
              onChange={(e) => setMessagePriority(e.target.value as MessagePriority)}
              options={[
                { value: 'LOW', label: 'נמוכה' },
                { value: 'MEDIUM', label: 'רגילה' },
                { value: 'HIGH', label: 'גבוהה' },
                { value: 'CRITICAL', label: 'קריטית' },
              ]}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSendMessage}
              isLoading={sendMessageMutation.isPending}
              className="flex-1"
            >
              <Send className="w-4 h-4 ml-2" />
              שלח הודעה
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowMessageModal(false);
                resetMessageForm();
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </UserLayout>
  );
}
