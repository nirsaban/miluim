'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);

      if (response.data.success) {
        sessionStorage.setItem('otpEmail', data.email);
        toast.success(response.data.message);
        router.push('/auth/otp');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'שגיאה בהתחברות';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-6">
        התחברות
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="אימייל"
          type="email"
          placeholder="your@email.com"
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
          error={errors.password?.message}
          {...register('password', {
            required: 'סיסמה היא שדה חובה',
          })}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          התחבר
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          אין לך חשבון?{' '}
          <Link
            href="/auth/register"
            className="text-military-700 font-medium hover:underline"
          >
            הרשם עכשיו
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
