'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  MapPin,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Hotel,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  ServiceAttendance,
  ServiceAttendanceStatus,
  SERVICE_ATTENDANCE_STATUS_LABELS,
  ReserveServiceCycle,
} from '@/types';

export default function CurrentServicePage() {
  const queryClient = useQueryClient();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');
  const [gunNumber, setGunNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Get current cycle
  const { data: currentCycle, isLoading: cycleLoading } = useQuery<ReserveServiceCycle | null>({
    queryKey: ['current-service-cycle'],
    queryFn: async () => {
      const response = await api.get('/service-cycles/current');
      return response.data;
    },
  });

  // Get my attendance
  const { data: myAttendance, isLoading: attendanceLoading } = useQuery<ServiceAttendance>({
    queryKey: ['my-service-attendance'],
    queryFn: async () => {
      const response = await api.get('/service-attendance/current/me');
      return response.data;
    },
    enabled: !!currentCycle,
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: {
      attendanceStatus?: ServiceAttendanceStatus;
      cannotAttendReason?: string;
      onboardGunNumber?: string;
      hotelRoomNumber?: string;
      notes?: string;
    }) => {
      const response = await api.patch('/service-attendance/current/me', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-service-attendance'] });
      toast.success('הסטטוס עודכן בהצלחה');
      setShowReasonInput(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון הסטטוס');
    },
  });

  // Initialize form values when attendance loads
  useState(() => {
    if (myAttendance) {
      setGunNumber(myAttendance.onboardGunNumber || '');
      setRoomNumber(myAttendance.hotelRoomNumber || '');
      setNotes(myAttendance.notes || '');
      setReason(myAttendance.cannotAttendReason || '');
    }
  });

  const handleStatusChange = (status: ServiceAttendanceStatus) => {
    if (status === 'NOT_COMING') {
      setShowReasonInput(true);
    } else {
      updateAttendanceMutation.mutate({ attendanceStatus: status });
    }
  };

  const handleNotComingSubmit = () => {
    if (!reason.trim()) {
      toast.error('נא לציין סיבת אי-הגעה');
      return;
    }
    updateAttendanceMutation.mutate({
      attendanceStatus: 'NOT_COMING',
      cannotAttendReason: reason,
    });
  };

  const handleOnboardingSubmit = () => {
    updateAttendanceMutation.mutate({
      onboardGunNumber: gunNumber || undefined,
      hotelRoomNumber: roomNumber || undefined,
      notes: notes || undefined,
    });
  };

  const isLoading = cycleLoading || attendanceLoading;

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner />
        </div>
      </UserLayout>
    );
  }

  if (!currentCycle) {
    return (
      <UserLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">
              אין סבב מילואים פעיל כרגע
            </h2>
            <p className="text-gray-500">
              כאשר יתחיל סבב מילואים חדש, תוכל לעדכן את סטטוס ההגעה שלך כאן
            </p>
          </CardContent>
        </Card>
      </UserLayout>
    );
  }

  const getStatusColor = (status: ServiceAttendanceStatus) => {
    switch (status) {
      case 'ARRIVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'NOT_COMING':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LEFT_EARLY':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <UserLayout>
      {/* Cycle Info Card */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-military-600" />
          <span className="font-bold">סבב מילואים נוכחי</span>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-bold text-military-700 mb-2">
            {currentCycle.name}
          </h2>
          {currentCycle.description && (
            <p className="text-gray-600 mb-3">{currentCycle.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(currentCycle.startDate).toLocaleDateString('he-IL')}
                {currentCycle.endDate && (
                  <> - {new Date(currentCycle.endDate).toLocaleDateString('he-IL')}</>
                )}
              </span>
            </div>
            {currentCycle.location && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{currentCycle.location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Status Card */}
      <Card className="mb-6">
        <CardHeader className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-military-600" />
          <span>סטטוס הגעה</span>
        </CardHeader>
        <CardContent>
          {/* Current Status Display */}
          {myAttendance && (
            <div
              className={`p-4 rounded-lg border-2 mb-4 ${getStatusColor(
                myAttendance.attendanceStatus
              )}`}
            >
              <div className="flex items-center gap-2">
                {myAttendance.attendanceStatus === 'ARRIVED' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : myAttendance.attendanceStatus === 'NOT_COMING' ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <span className="font-bold">
                  {SERVICE_ATTENDANCE_STATUS_LABELS[myAttendance.attendanceStatus]}
                </span>
              </div>
              {myAttendance.cannotAttendReason && (
                <p className="mt-2 text-sm">
                  סיבה: {myAttendance.cannotAttendReason}
                </p>
              )}
            </div>
          )}

          {/* Status Selection Buttons */}
          {!showReasonInput && (
            <div className="space-y-3">
              <p className="text-gray-600 mb-3">עדכן את סטטוס ההגעה שלך:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleStatusChange('ARRIVED')}
                  variant={myAttendance?.attendanceStatus === 'ARRIVED' ? 'primary' : 'secondary'}
                  className="flex items-center justify-center gap-2"
                  isLoading={updateAttendanceMutation.isPending}
                >
                  <UserCheck className="w-4 h-4" />
                  מגיע
                </Button>
                <Button
                  onClick={() => handleStatusChange('NOT_COMING')}
                  variant={myAttendance?.attendanceStatus === 'NOT_COMING' ? 'danger' : 'secondary'}
                  className="flex items-center justify-center gap-2"
                  isLoading={updateAttendanceMutation.isPending}
                >
                  <UserX className="w-4 h-4" />
                  לא מגיע
                </Button>
              </div>
            </div>
          )}

          {/* Not Coming Reason Input */}
          {showReasonInput && (
            <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">סיבת אי-הגעה</span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="נא לפרט את סיבת אי-ההגעה..."
                className="w-full p-3 border rounded-lg resize-none h-24"
                required
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleNotComingSubmit}
                  variant="danger"
                  isLoading={updateAttendanceMutation.isPending}
                >
                  שלח
                </Button>
                <Button
                  onClick={() => setShowReasonInput(false)}
                  variant="secondary"
                >
                  ביטול
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Details Card - Show only if ARRIVED or LATE */}
      {myAttendance &&
        (myAttendance.attendanceStatus === 'ARRIVED' ||
          myAttendance.attendanceStatus === 'LATE') && (
          <Card>
            <CardHeader className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-military-600" />
              <span>פרטי קליטה</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <Shield className="w-4 h-4" />
                      מספר נשק
                    </label>
                    <Input
                      value={gunNumber}
                      onChange={(e) => setGunNumber(e.target.value)}
                      placeholder="הזן מספר נשק"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <Hotel className="w-4 h-4" />
                      מספר חדר
                    </label>
                    <Input
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="הזן מספר חדר"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4" />
                    הערות
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הערות נוספות..."
                    className="w-full p-3 border rounded-lg resize-none h-20"
                  />
                </div>

                <Button
                  onClick={handleOnboardingSubmit}
                  variant="primary"
                  className="w-full"
                  isLoading={updateAttendanceMutation.isPending}
                >
                  שמור פרטי קליטה
                </Button>

                {/* Show saved values */}
                {(myAttendance.onboardGunNumber || myAttendance.hotelRoomNumber) && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700">
                      <p className="font-medium mb-1">פרטים שמורים:</p>
                      {myAttendance.onboardGunNumber && (
                        <p>מספר נשק: {myAttendance.onboardGunNumber}</p>
                      )}
                      {myAttendance.hotelRoomNumber && (
                        <p>מספר חדר: {myAttendance.hotelRoomNumber}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
    </UserLayout>
  );
}
