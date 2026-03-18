'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, MapPin, Briefcase, GraduationCap, Mail, Shield, Building2, Calendar, Save, Fingerprint, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MILITARY_ROLE_LABELS, MilitaryRole } from '@/types';
import {
  checkWebAuthnSupport,
  getPasskeyStatus,
  registerPasskey,
  deletePasskey,
  getDeviceName,
  type PasskeyStatus,
  type WebAuthnSupport,
} from '@/lib/webauthn';

interface UserProfile {
  id: string;
  personalId: string;
  fullName: string;
  email: string;
  phone: string;
  armyNumber: string;
  idNumber?: string;
  militaryRole?: MilitaryRole;
  dailyJob?: string;
  city?: string;
  fieldOfStudy?: string;
  birthDay?: string;
  department?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    dailyJob: '',
    city: '',
    fieldOfStudy: '',
  });
  const [webAuthnSupport, setWebAuthnSupport] = useState<WebAuthnSupport | null>(null);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);

  // Check WebAuthn support
  useEffect(() => {
    async function checkSupport() {
      const support = await checkWebAuthnSupport();
      setWebAuthnSupport(support);
    }
    checkSupport();
  }, []);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const response = await api.get('/users/me');
      return response.data;
    },
  });

  // Query passkey status
  const { data: passkeyStatus, refetch: refetchPasskeys } = useQuery<PasskeyStatus>({
    queryKey: ['passkey-status'],
    queryFn: getPasskeyStatus,
    enabled: webAuthnSupport?.isSupported ?? false,
  });

  const handleAddPasskey = async () => {
    if (!webAuthnSupport?.isPlatformAuthenticatorAvailable) {
      toast.error('המכשיר לא תומך בזיהוי ביומטרי');
      return;
    }

    setIsAddingPasskey(true);
    try {
      const deviceName = getDeviceName();
      const result = await registerPasskey(deviceName);
      if (result.success) {
        toast.success('מפתח גישה נוסף בהצלחה');
        refetchPasskeys();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'שגיאה בהוספת מפתח גישה';
      toast.error(message);
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleDeletePasskey = async (credentialId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את מפתח הגישה?')) {
      return;
    }

    setDeletingCredentialId(credentialId);
    try {
      const result = await deletePasskey(credentialId);
      if (result.success) {
        toast.success('מפתח גישה נמחק');
        refetchPasskeys();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה במחיקת מפתח גישה';
      toast.error(message);
    } finally {
      setDeletingCredentialId(null);
    }
  };

  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        dailyJob: profile.dailyJob || '',
        city: profile.city || '',
        fieldOfStudy: profile.fieldOfStudy || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.patch('/users/me', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('הפרופיל עודכן בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setIsEditing(false);
    },
    onError: () => {
      toast.error('שגיאה בעדכון הפרופיל');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        dailyJob: profile.dailyJob || '',
        city: profile.city || '',
        fieldOfStudy: profile.fieldOfStudy || '',
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <UserLayout>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">פרופיל</h1>
        <p className="text-gray-600 mt-1">צפייה ועריכת פרטים אישיים</p>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-military-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-military-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile?.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                {profile?.militaryRole && (
                  <span className="px-2 py-1 bg-military-100 text-military-700 rounded text-sm">
                    {MILITARY_ROLE_LABELS[profile.militaryRole]}
                  </span>
                )}
                {profile?.department && (
                  <span className="text-sm text-gray-500">{profile.department.name}</span>
                )}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                מס׳ אישי: {profile?.personalId}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-Only Info */}
      <Card className="mb-6">
        <CardHeader>פרטים צבאיים</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">מספר צבאי</div>
                <div className="font-medium">{profile?.armyNumber || 'לא מוגדר'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">אימייל</div>
                <div className="font-medium text-sm">{profile?.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">מחלקה</div>
                <div className="font-medium">{profile?.department?.name || 'לא מוגדר'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">תאריך הצטרפות</div>
                <div className="font-medium">{profile?.createdAt ? formatDate(profile.createdAt) : 'לא זמין'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Info */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>פרטים אישיים</span>
          {!isEditing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              עריכה
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  טלפון
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-1234567"
                  disabled={!isEditing}
                  dir="ltr"
                  className="text-right"
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  עיר מגורים
                </label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="הזן עיר מגורים"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  עיסוק יומי
                </label>
                <Input
                  value={formData.dailyJob}
                  onChange={(e) => setFormData({ ...formData, dailyJob: e.target.value })}
                  placeholder="תפקיד/עיסוק יומי"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="label flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-400" />
                  תחום לימודים
                </label>
                <Input
                  value={formData.fieldOfStudy}
                  onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                  placeholder="תחום לימודים אקדמי"
                  disabled={!isEditing}
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    isLoading={updateMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    שמור שינויים
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                  >
                    ביטול
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Passkey Management */}
      {webAuthnSupport?.isSupported && (
        <Card className="mt-6">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-military-600" />
              <span>זיהוי ביומטרי</span>
            </div>
            {webAuthnSupport?.isPlatformAuthenticatorAvailable && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddPasskey}
                isLoading={isAddingPasskey}
                disabled={isAddingPasskey}
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף מכשיר
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!webAuthnSupport?.isPlatformAuthenticatorAvailable ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                המכשיר שלך לא תומך בזיהוי ביומטרי (Face ID / Touch ID / טביעת אצבע).
              </div>
            ) : passkeyStatus?.credentials && passkeyStatus.credentials.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  מכשירים רשומים לזיהוי ביומטרי. ניתן להתחבר עם כל אחד מהמכשירים האלו.
                </p>
                {passkeyStatus.credentials.map((credential) => (
                  <div
                    key={credential.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center">
                        <Fingerprint className="w-5 h-5 text-military-600" />
                      </div>
                      <div>
                        <div className="font-medium">{credential.deviceName}</div>
                        <div className="text-xs text-gray-500">
                          נוסף: {formatDate(credential.createdAt)}
                          {credential.lastUsedAt !== credential.createdAt && (
                            <> | שימוש אחרון: {formatDate(credential.lastUsedAt)}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePasskey(credential.id)}
                      isLoading={deletingCredentialId === credential.id}
                      disabled={deletingCredentialId === credential.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Fingerprint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  לא הגדרת עדיין זיהוי ביומטרי.
                  <br />
                  הוסף מכשיר להתחברות מהירה ומאובטחת.
                </p>
                <Button
                  onClick={handleAddPasskey}
                  isLoading={isAddingPasskey}
                  disabled={isAddingPasskey}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הגדר זיהוי ביומטרי
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </UserLayout>
  );
}
