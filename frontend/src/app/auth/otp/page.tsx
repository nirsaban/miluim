'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function OTPPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('otpEmail');
    if (!storedEmail) {
      router.push('/auth/login');
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs?.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = code.join('');

    if (otpCode.length !== 6) {
      toast.error('נא להזין קוד בן 6 ספרות');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        code: otpCode,
      });

      if (response.data.success) {
        sessionStorage.removeItem('otpEmail');
        // Wait for token to be stored before redirecting
        await login(response.data.user, response.data.token);
        toast.success('התחברת בהצלחה!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'קוד אימות שגוי';
      toast.error(message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('קוד אימות חדש נשלח');
      setResendTimer(60);
    } catch (error: any) {
      toast.error('שגיאה בשליחת קוד אימות');
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-center text-military-700 mb-2">
        אימות קוד
      </h2>
      <p className="text-center text-gray-600 mb-6">
        קוד אימות נשלח למייל שלך
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" dir="ltr" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent"
            />
          ))}
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          אמת
        </Button>
      </form>

      <div className="mt-6 text-center">
        {resendTimer > 0 ? (
          <p className="text-gray-600">
            שליחה חוזרת אפשרית בעוד {resendTimer} שניות
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-military-700 font-medium hover:underline"
          >
            שלח קוד אימות חדש
          </button>
        )}
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            sessionStorage.removeItem('otpEmail');
            router.push('/auth/login');
          }}
          className="text-gray-500 text-sm hover:underline"
        >
          חזרה להתחברות
        </button>
      </div>
    </AuthLayout>
  );
}
