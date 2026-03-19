'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import api from '@/lib/api';

interface RegisterForm {
  personalId: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  idNumber: string;
  city?: string;
  dailyJob?: string;
  fieldOfStudy?: string;
  birthDay?: string;
}

interface Skill {
  id: string;
  name: string;
  displayName: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface PreApprovedData {
  personalId: string;
  fullName: string;
  militaryRole: string;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const MILITARY_ROLE_LABELS: Record<string, string> = {
  PLATOON_COMMANDER: 'מפקד פלוגה',
  SERGEANT_MAJOR: 'סמ״פ',
  OPERATIONS_SGT: 'קמב״צ',
  OPERATIONS_NCO: 'סמב״צ',
  DUTY_OFFICER: 'מ״מ',
  SQUAD_COMMANDER: 'מפקד',
  FIGHTER: 'לוחם',
};

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [preApprovedData, setPreApprovedData] = useState<PreApprovedData | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  // Fetch skills and departments on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsRes, departmentsRes] = await Promise.all([
          api.get('/skills'),
          api.get('/users/departments/list'),
        ]);
        setSkills(skillsRes.data);
        setDepartments(departmentsRes.data);
      } catch (error) {
        console.error('Error fetching skills/departments:', error);
      }
    };
    fetchData();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');
  const personalId = watch('personalId');

  const handleCheckPersonalId = async () => {
    if (!personalId) {
      toast.error('נא להזין מספר אישי');
      return;
    }

    setIsChecking(true);
    try {
      const response = await api.post('/auth/check-personalid', { personalId });

      if (response.data.success) {
        setPreApprovedData(response.data.user);
        toast.success('מספר אישי אומת! ניתן להמשיך בהשלמת ההרשמה');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'מספר אישי לא נמצא במערכת';
      toast.error(message);
      setPreApprovedData(null);
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!preApprovedData) {
      toast.error('נא לאמת את המספר האישי תחילה');
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await api.post('/auth/register', {
        ...registerData,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        departmentId: selectedDepartmentId || undefined,
      });

      if (response.data.success) {
        toast.success('ההרשמה הושלמה בהצלחה!');
        router.push('/auth/login');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בהשלמת ההרשמה';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        השלמת הרשמה למערכת
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Personal ID Check */}
        <div className="space-y-2">
          <Input
            label="מספר אישי"
            placeholder="1234567"
            required
            disabled={!!preApprovedData}
            error={errors.personalId?.message}
            {...register('personalId', {
              required: 'מספר אישי הוא שדה חובה',
            })}
          />
          {!preApprovedData && (
            <Button
              type="button"
              onClick={handleCheckPersonalId}
              isLoading={isChecking}
              variant="secondary"
              className="w-full"
            >
              אמת מספר אישי
            </Button>
          )}
        </div>

        {preApprovedData && (
          <>
            {/* Read-only system fields */}
            <div className="bg-military-50 p-4 rounded-lg space-y-2 border-2 border-military-200">
              <h3 className="font-semibold text-military-700 mb-2">
                פרטי מערכת (קבועים - לא ניתן לשינוי)
              </h3>
              <div className="space-y-1">
                <div>
                  <span className="text-sm text-gray-600">תפקיד צבאי: </span>
                  <span className="font-medium text-military-700">
                    {MILITARY_ROLE_LABELS[preApprovedData.militaryRole] || preApprovedData.militaryRole}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">מחלקה: </span>
                  <span className="font-medium text-military-700">
                    {preApprovedData.department?.name || 'לא משוייך'}
                  </span>
                </div>
              </div>
            </div>

            {/* User-fillable fields */}
            <Input
              label="שם מלא"
              placeholder="ישראל ישראלי"
              required
              error={errors.fullName?.message}
              {...register('fullName', {
                required: 'שם מלא הוא שדה חובה',
              })}
            />

            <Input
              label="טלפון"
              placeholder="0501234567"
              required
              error={errors.phone?.message}
              {...register('phone', {
                required: 'טלפון הוא שדה חובה',
                pattern: {
                  value: /^05\d{8}$/,
                  message: 'מספר טלפון לא תקין',
                },
              })}
            />

            <Input
              label="אימייל"
              type="email"
              placeholder="your@email.com"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'אימייל הוא שדה חובה',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'כתובת אימייל לא תקינה',
                },
              })}
            />

            <Input
              label="סיסמה"
              type="password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register('password', {
                required: 'סיסמה היא שדה חובה',
                minLength: {
                  value: 8,
                  message: 'הסיסמה חייבת להכיל לפחות 8 תווים',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'הסיסמה חייבת להכיל אותיות גדולות, קטנות ומספרים',
                },
              })}
            />

            <Input
              label="אימות סיסמה"
              type="password"
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'אימות סיסמה הוא שדה חובה',
                validate: (value) => value === password || 'הסיסמאות לא תואמות',
              })}
            />

            <Input
              label="תעודת זהות"
              placeholder="123456789"
              required
              error={errors.idNumber?.message}
              {...register('idNumber', {
                required: 'תעודת זהות היא שדה חובה',
                pattern: {
                  value: /^\d{9}$/,
                  message: 'מספר תעודת זהות לא תקין',
                },
              })}
            />

            {/* Department Selection */}
            <div>
              <Select
                label="מחלקה"
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="בחר מחלקה"
              />
            </div>

            {/* Skills Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כישורים
              </label>
              <MultiSelect
                options={skills.map((s) => ({ value: s.id, label: s.displayName }))}
                value={selectedSkillIds}
                onChange={setSelectedSkillIds}
                placeholder="בחר כישורים..."
              />
            </div>

            {/* Optional fields toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="text-sm text-military-700 hover:underline"
              >
                {showOptional ? 'הסתר שדות אופציונליים' : 'הצג שדות אופציונליים'}
              </button>
            </div>

            {showOptional && (
              <div className="space-y-4 border-t pt-4">
                <Input
                  label="עיר"
                  placeholder="תל אביב"
                  {...register('city')}
                />

                <Input
                  label="עבודה אזרחית"
                  placeholder="מהנדס תוכנה"
                  {...register('dailyJob')}
                />

                <Input
                  label="תחום לימודים"
                  placeholder="מדעי המחשב"
                  {...register('fieldOfStudy')}
                />

                <Input
                  label="תאריך לידה"
                  type="date"
                  {...register('birthDay')}
                />
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              השלם הרשמה
            </Button>
          </>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          כבר יש לך חשבון?{' '}
          <Link
            href="/auth/login"
            className="text-military-700 font-medium hover:underline"
          >
            התחבר
          </Link>
        </p>
      </div>

      {!preApprovedData && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>שים לב:</strong> ניתן להשלים הרשמה רק אם המספר האישי שלך נוצר מראש על ידי מפקד הפלוגה.
            אם אינך מצליח לאמת את המספר האישי, פנה למפקד.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
