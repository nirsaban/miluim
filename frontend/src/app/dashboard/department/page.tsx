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
  Home,
  FileText,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
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
import { MilitaryRole, MILITARY_ROLE_LABELS, MessageType, MessagePriority, LeaveStatus, LeaveType, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from '@/types';
import { useAuth, useIsFullAdmin } from '@/hooks/useAuth';
import { cn, formatDateTime, formatDate } from '@/lib/utils';

// Types
interface DepartmentStats {
  department: { id: string; name: string };
  activeCycle: { id: string; name: string } | null;
  overview: {
    totalUsers: number;
    totalInCycle: number;
    inBase: number;
    onLeave: number;
    todayShifts: number;
  };
  attendance: {
    arrived: number;
    notComing: number;
    pending: number;
    late: number;
    unconfirmed: number;
  };
  leaves: {
    active: number;
    atHome: number;
    shortLeave: number;
    usersAtHome: Array<{ id: string; name: string; phone: string; expectedReturn: string }>;
    usersOnShortLeave: Array<{ id: string; name: string; phone: string; category: string; expectedReturn: string }>;
  };
  requests: {
    pending: number;
    approved: number;
    rejected: number;
  };
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

interface LeaveRequest {
  id: string;
  type: LeaveType;
  status: LeaveStatus;
  reason: string | null;
  exitTime: string;
  expectedReturn: string;
  actualReturn: string | null;
  adminNote: string | null;
  createdAt: string;
  soldier: {
    id: string;
    fullName: string;
    phone: string;
    armyNumber: string;
  };
  category: { id: string; displayName: string } | null;
  approvedBy: { id: string; fullName: string } | null;
}

interface DepartmentMessage {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  createdAt: string;
  createdBy: { id: string; fullName: string } | null;
  _count: { confirmations: number };
}

type TabType = 'overview' | 'requests' | 'soldiers' | 'messages';

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

const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  RETURNED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

export default function DepartmentPage() {
  const { user } = useAuth();
  const isFullAdmin = useIsFullAdmin();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('');

  // Expandable sections
  const [showAtHome, setShowAtHome] = useState(false);
  const [showShortLeave, setShowShortLeave] = useState(false);

  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('GENERAL');
  const [messagePriority, setMessagePriority] = useState<MessagePriority>('MEDIUM');

  // Request action modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // Queries
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<DepartmentStats>({
    queryKey: ['department-comprehensive-stats'],
    queryFn: async () => {
      const response = await api.get('/users/department/comprehensive-stats');
      return response.data;
    },
  });

  const { data: soldiers, isLoading: isLoadingSoldiers } = useQuery<SoldierWithStatus[]>({
    queryKey: ['department-soldiers'],
    queryFn: async () => {
      const response = await api.get('/users/department/soldiers-with-status');
      return response.data;
    },
    enabled: activeTab === 'soldiers',
  });

  const { data: leaveRequests, isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['department-leave-requests', requestStatusFilter, requestTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requestStatusFilter) params.append('status', requestStatusFilter);
      if (requestTypeFilter) params.append('type', requestTypeFilter);
      const response = await api.get(`/users/department/leave-requests?${params.toString()}`);
      return response.data;
    },
    enabled: activeTab === 'requests',
  });

  const { data: messages, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery<DepartmentMessage[]>({
    queryKey: ['department-messages'],
    queryFn: async () => {
      const response = await api.get('/users/department/messages');
      return response.data;
    },
    enabled: activeTab === 'messages',
  });

  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type: MessageType; priority: MessagePriority }) => {
      const response = await api.post('/messages/department', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההודעה נשלחה למחלקה בהצלחה');
      setShowMessageModal(false);
      resetMessageForm();
      refetchMessages();
    },
    onError: () => {
      toast.error('שגיאה בשליחת ההודעה');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote?: string }) => {
      const response = await api.patch(`/leave-requests/${id}/approve`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הבקשה אושרה');
      closeActionModal();
      refetchRequests();
      refetchStats();
    },
    onError: () => {
      toast.error('שגיאה באישור הבקשה');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote?: string }) => {
      const response = await api.patch(`/leave-requests/${id}/reject`, { adminNote });
      return response.data;
    },
    onSuccess: () => {
      toast.success('הבקשה נדחתה');
      closeActionModal();
      refetchRequests();
      refetchStats();
    },
    onError: () => {
      toast.error('שגיאה בדחיית הבקשה');
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/leave-requests/${id}/return`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('החייל סומן כחזר');
      refetchRequests();
      refetchStats();
    },
    onError: () => {
      toast.error('שגיאה בסימון חזרה');
    },
  });

  // Helpers
  const resetMessageForm = () => {
    setMessageTitle('');
    setMessageContent('');
    setMessageType('GENERAL');
    setMessagePriority('MEDIUM');
  };

  const closeActionModal = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminNote('');
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

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === 'approve') {
      approveMutation.mutate({ id: selectedRequest.id, adminNote });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, adminNote });
    }
  };

  const filteredSoldiers = soldiers?.filter((soldier) => {
    const matchesSearch =
      soldier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      soldier.armyNumber.includes(searchTerm) ||
      soldier.phone.includes(searchTerm);

    const matchesStatus =
      !filterStatus ||
      (filterStatus === 'ON_LEAVE' && soldier.activeLeave) ||
      (filterStatus === 'IN_BASE' && !soldier.activeLeave && soldier.attendance?.attendanceStatus === 'ARRIVED') ||
      (filterStatus !== 'ON_LEAVE' && filterStatus !== 'IN_BASE' && soldier.attendance?.attendanceStatus === filterStatus);

    return matchesSearch && matchesStatus;
  });

  // Access check
  const hasAccess = user?.role === 'OFFICER' || user?.role === 'ADMIN' || isFullAdmin;

  if (!hasAccess) {
    return (
      <UserLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">אין לך הרשאה לצפות בדף זה</p>
        </div>
      </UserLayout>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'סקירה', icon: BarChart3 },
    { id: 'requests' as TabType, label: 'בקשות יציאה', icon: FileText, badge: stats?.requests.pending },
    { id: 'soldiers' as TabType, label: 'חיילים', icon: Users },
    { id: 'messages' as TabType, label: 'הודעות', icon: MessageSquare },
  ];

  return (
    <UserLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-military-700">המחלקה שלי</h1>
            <p className="text-gray-600 mt-1">
              {stats?.department?.name || 'טוען...'}
              {stats?.activeCycle && (
                <span className="text-military-600 font-medium"> - {stats.activeCycle.name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => refetchStats()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => setShowMessageModal(true)}>
              <MessageSquare className="w-4 h-4 ml-2" />
              שלח הודעה
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap -mb-px',
                  activeTab === tab.id
                    ? 'border-military-600 text-military-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            isLoading={isLoadingStats}
            showAtHome={showAtHome}
            setShowAtHome={setShowAtHome}
            showShortLeave={showShortLeave}
            setShowShortLeave={setShowShortLeave}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab
            requests={leaveRequests}
            isLoading={isLoadingRequests}
            statusFilter={requestStatusFilter}
            setStatusFilter={setRequestStatusFilter}
            typeFilter={requestTypeFilter}
            setTypeFilter={setRequestTypeFilter}
            onApprove={(req) => {
              setSelectedRequest(req);
              setActionType('approve');
            }}
            onReject={(req) => {
              setSelectedRequest(req);
              setActionType('reject');
            }}
            onReturn={(id) => returnMutation.mutate(id)}
            isReturning={returnMutation.isPending}
          />
        )}

        {activeTab === 'soldiers' && (
          <SoldiersTab
            soldiers={filteredSoldiers}
            isLoading={isLoadingSoldiers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            messages={messages}
            isLoading={isLoadingMessages}
            onNewMessage={() => setShowMessageModal(true)}
          />
        )}
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

      {/* Action Modal */}
      <Modal
        isOpen={!!selectedRequest && !!actionType}
        onClose={closeActionModal}
        title={actionType === 'approve' ? 'אישור בקשה' : 'דחיית בקשה'}
        size="md"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-lg">{selectedRequest.soldier.fullName}</p>
              <p className="text-gray-600">{LEAVE_TYPE_LABELS[selectedRequest.type]}</p>
              {selectedRequest.category && (
                <p className="text-sm text-gray-500">קטגוריה: {selectedRequest.category.displayName}</p>
              )}
              <div className="mt-2 text-sm">
                <p>יציאה: {formatDateTime(selectedRequest.exitTime)}</p>
                <p>חזרה צפויה: {formatDateTime(selectedRequest.expectedReturn)}</p>
              </div>
              {selectedRequest.reason && (
                <p className="mt-2 text-sm text-gray-600">סיבה: {selectedRequest.reason}</p>
              )}
            </div>

            <div>
              <label className="label">הערה (אופציונלי)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="input min-h-[80px] resize-none"
                rows={3}
                placeholder="הוסף הערה..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAction}
                isLoading={approveMutation.isPending || rejectMutation.isPending}
                variant={actionType === 'reject' ? 'danger' : 'primary'}
                className="flex-1"
              >
                {actionType === 'approve' ? 'אשר בקשה' : 'דחה בקשה'}
              </Button>
              <Button variant="secondary" onClick={closeActionModal}>
                ביטול
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </UserLayout>
  );
}

// Overview Tab Component
function OverviewTab({
  stats,
  isLoading,
  showAtHome,
  setShowAtHome,
  showShortLeave,
  setShowShortLeave,
}: {
  stats: DepartmentStats | undefined;
  isLoading: boolean;
  showAtHome: boolean;
  setShowAtHome: (v: boolean) => void;
  showShortLeave: boolean;
  setShowShortLeave: (v: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-military-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.overview.totalUsers}</p>
            <p className="text-sm text-gray-600">סה״כ במחלקה</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-700">{stats.overview.inBase}</p>
            <p className="text-sm text-gray-600">בבסיס</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <LogOut className="w-8 h-8 mx-auto text-orange-600 mb-2" />
            <p className="text-2xl font-bold text-orange-700">{stats.overview.onLeave}</p>
            <p className="text-sm text-gray-600">ביציאה</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-yellow-700">{stats.requests.pending}</p>
            <p className="text-sm text-gray-600">בקשות ממתינות</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-700">{stats.overview.todayShifts}</p>
            <p className="text-sm text-gray-600">משמרות היום</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance & Leave Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Status */}
        <Card>
          <CardHeader>סטטוס נוכחות בסבב</CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>הגיעו</span>
                </div>
                <span className="font-bold text-green-700">{stats.attendance.arrived}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span>ממתינים לאישור</span>
                </div>
                <span className="font-bold text-yellow-700">{stats.attendance.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span>לא מגיעים</span>
                </div>
                <span className="font-bold text-red-700">{stats.attendance.notComing}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span>באיחור</span>
                </div>
                <span className="font-bold text-orange-700">{stats.attendance.late}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Statistics */}
        <Card>
          <CardHeader>סטטיסטיקת בקשות</CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span>ממתינות לאישור</span>
                <span className="font-bold text-yellow-700">{stats.requests.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span>אושרו (ממתינות להפעלה)</span>
                <span className="font-bold text-blue-700">{stats.requests.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span>נדחו (30 יום אחרונים)</span>
                <span className="font-bold text-red-700">{stats.requests.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users on Leave Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* At Home */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAtHome(!showAtHome)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                <span>יציאה הביתה ({stats.leaves.atHome})</span>
              </div>
              {showAtHome ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {showAtHome && (
            <CardContent>
              {stats.leaves.usersAtHome.length === 0 ? (
                <p className="text-center text-gray-500 py-4">אין חיילים ביציאה הביתה</p>
              ) : (
                <div className="space-y-2">
                  {stats.leaves.usersAtHome.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">חזרה: {formatDateTime(user.expectedReturn)}</p>
                      </div>
                      <a href={`tel:${user.phone}`} className="p-2 text-gray-500 hover:text-military-700">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Short Leave */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowShortLeave(!showShortLeave)}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-orange-600" />
                <span>יציאה קצרה ({stats.leaves.shortLeave})</span>
              </div>
              {showShortLeave ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {showShortLeave && (
            <CardContent>
              {stats.leaves.usersOnShortLeave.length === 0 ? (
                <p className="text-center text-gray-500 py-4">אין חיילים ביציאה קצרה</p>
              ) : (
                <div className="space-y-2">
                  {stats.leaves.usersOnShortLeave.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.category} - חזרה: {formatDateTime(user.expectedReturn)}</p>
                      </div>
                      <a href={`tel:${user.phone}`} className="p-2 text-gray-500 hover:text-military-700">
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Requests Tab Component
function RequestsTab({
  requests,
  isLoading,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  onApprove,
  onReject,
  onReturn,
  isReturning,
}: {
  requests: LeaveRequest[] | undefined;
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onApprove: (req: LeaveRequest) => void;
  onReject: (req: LeaveRequest) => void;
  onReturn: (id: string) => void;
  isReturning: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow-sm">
        <Select
          label="סטטוס"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'הכל' },
            { value: 'PENDING', label: 'ממתין' },
            { value: 'APPROVED', label: 'מאושר' },
            { value: 'ACTIVE', label: 'פעיל' },
            { value: 'RETURNED', label: 'חזר' },
            { value: 'REJECTED', label: 'נדחה' },
          ]}
          className="w-32"
        />
        <Select
          label="סוג"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'הכל' },
            { value: 'SHORT', label: 'יציאה קצרה' },
            { value: 'HOME', label: 'יציאה הביתה' },
          ]}
          className="w-36"
        />
      </div>

      {/* Requests List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="divide-y">
              {requests.map((request) => {
                const isOverdue = request.status === 'ACTIVE' && new Date(request.expectedReturn) < new Date();
                return (
                  <div key={request.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{request.soldier.fullName}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-lg ${REQUEST_STATUS_COLORS[isOverdue ? 'OVERDUE' : request.status]}`}>
                            {isOverdue ? 'באיחור' : LEAVE_STATUS_LABELS[request.status]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {LEAVE_TYPE_LABELS[request.type]}
                          {request.category && ` - ${request.category.displayName}`}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          יציאה: {formatDateTime(request.exitTime)} | חזרה: {formatDateTime(request.expectedReturn)}
                        </p>
                        {request.reason && (
                          <p className="text-sm text-gray-500 mt-1">סיבה: {request.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'PENDING' && (
                          <>
                            <Button size="sm" onClick={() => onApprove(request)}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => onReject(request)}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {request.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            onClick={() => onReturn(request.id)}
                            isLoading={isReturning}
                          >
                            סמן חזרה
                          </Button>
                        )}
                        <a
                          href={`tel:${request.soldier.phone}`}
                          className="p-2 text-gray-500 hover:text-military-700"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין בקשות</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Soldiers Tab Component
function SoldiersTab({
  soldiers,
  isLoading,
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
}: {
  soldiers: SoldierWithStatus[] | undefined;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span>חיילי המחלקה ({soldiers?.length || 0})</span>
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : soldiers && soldiers.length > 0 ? (
          <div className="space-y-3">
            {soldiers.map((soldier) => (
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
                  {soldier.activeLeave ? (
                    <Badge variant="warning">ביציאה</Badge>
                  ) : soldier.attendance ? (
                    <span
                      className={`px-2 py-1 text-xs rounded-lg ${
                        ATTENDANCE_STATUS_COLORS[soldier.attendance.attendanceStatus] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ATTENDANCE_STATUS_LABELS[soldier.attendance.attendanceStatus] || soldier.attendance.attendanceStatus}
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg">לא רשום</span>
                  )}
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
  );
}

// Messages Tab Component
function MessagesTab({
  messages,
  isLoading,
  onNewMessage,
}: {
  messages: DepartmentMessage[] | undefined;
  isLoading: boolean;
  onNewMessage: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-700">הודעות שנשלחו למחלקה</h3>
        <Button onClick={onNewMessage}>
          <Send className="w-4 h-4 ml-2" />
          הודעה חדשה
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="divide-y">
              {messages.map((message) => (
                <div key={message.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold">{message.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{formatDateTime(message.createdAt)}</span>
                        {message.createdBy && <span>על ידי {message.createdBy.fullName}</span>}
                        <span>{message._count.confirmations} אישורים</span>
                      </div>
                    </div>
                    <Badge variant={message.priority === 'HIGH' || message.priority === 'CRITICAL' ? 'danger' : 'default'}>
                      {message.type === 'URGENT' ? 'דחוף' : message.type === 'ANNOUNCEMENT' ? 'הכרזה' : 'כללי'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">אין הודעות מחלקתיות</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
