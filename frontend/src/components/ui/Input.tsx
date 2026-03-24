'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', showPasswordToggle, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    // Determine if this is a password field that should have toggle
    const isPassword = type === 'password';
    const shouldShowToggle = isPassword && showPasswordToggle !== false;
    const actualType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-content-secondary mb-1.5">
            {label}
            {props.required && <span className="text-danger mr-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            type={actualType}
            className={cn(
              'w-full px-4 py-3 border border-border rounded-input bg-glass backdrop-blur-glass text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200 text-base min-h-[48px]',
              error && 'border-danger focus:ring-danger/40 bg-danger-surface',
              shouldShowToggle && 'pl-12',
              className
            )}
            ref={ref}
            {...props}
          />
          {shouldShowToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary focus:outline-none p-1 rounded-lg hover:bg-surface-2 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-sm text-content-muted">{hint}</p>
        )}
        {error && <p className="mt-1.5 text-sm text-danger-light">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
