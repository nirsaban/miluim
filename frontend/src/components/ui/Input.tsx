'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 mr-1">*</span>}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-military-500 focus:border-transparent transition-all duration-200 text-base min-h-[48px]',
            error && 'border-red-500 focus:ring-red-500 bg-red-50',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
