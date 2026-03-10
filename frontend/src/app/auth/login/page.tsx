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
import { useAuth } from '@/hooks/useAuth';

interface LoginForm {
  personalId: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
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
        // Wait for token to be stored before redirecting
        await login(response.data.user, response.data.token);
        toast.success('התחברת בהצלחה!');
        router.push('/dashboard');
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
        התחברות למערכת
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="מספר אישי"
          placeholder="1234567"
          error={errors.personalId?.message}
          {...register('personalId', {
            required: 'מספר אישי הוא שדה חובה',
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
          עדיין לא השלמת הרשמה?{' '}
          <Link
            href="/auth/register"
            className="text-military-700 font-medium hover:underline"
          >
            השלם הרשמה
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
