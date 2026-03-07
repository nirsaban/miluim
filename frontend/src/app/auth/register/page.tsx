'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { MultiSelect } from '@/components/ui/MultiSelect';
import api from '@/lib/api';
import { ROLE_LABELS, UserRole, Skill } from '@/types';

interface RegisterForm {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  armyNumber: string;
  idNumber: string;
  role: UserRole;
  skillIds?: string[];
  dailyJob?: string;
  city?: string;
  fieldOfStudy?: string;
  birthDay?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const { data: skills } = useQuery<Skill[]>({
    queryKey: ['skills-public'],
    queryFn: async () => {
      const response = await api.get('/skills');
      return response.data;
    },
  });

  const skillOptions = skills?.map((s) => ({ value: s.id, label: s.displayName })) || [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      role: 'SOLDIER',
    },
  });

  const password = watch('password');

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await api.post('/auth/register', {
        ...registerData,
        skillIds: selectedSkillIds,
      });

      if (response.data.success) {
        toast.success('ההרשמה בוצעה בהצלחה!');
        router.push('/auth/login');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בהרשמה';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        הרשמה למערכת
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Select
          label="תפקיד"
          options={roleOptions}
          required
          error={errors.role?.message}
          {...register('role', {
            required: 'תפקיד הוא שדה חובה',
          })}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            כישורים נוספים
            <span className="text-gray-400 text-xs mr-1">(אופציונלי)</span>
          </label>
          <MultiSelect
            options={skillOptions}
            value={selectedSkillIds}
            onChange={setSelectedSkillIds}
            placeholder="בחר כישורים..."
          />
          <p className="text-xs text-gray-500">
            בחר כישורים נוספים שיש לך (נהיגה, חובשות וכו&apos;)
          </p>
        </div>

        <Input
          label="מספר אישי"
          placeholder="1234567"
          required
          error={errors.armyNumber?.message}
          {...register('armyNumber', {
            required: 'מספר אישי הוא שדה חובה',
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
              label="עבודה אזרחית"
              placeholder="מהנדס תוכנה"
              {...register('dailyJob')}
            />

            <Input label="עיר" placeholder="תל אביב" {...register('city')} />

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
          הרשם
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          יש לך כבר חשבון?{' '}
          <Link
            href="/auth/login"
            className="text-military-700 font-medium hover:underline"
          >
            התחבר
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
