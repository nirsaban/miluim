'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-content-secondary mb-1.5">
            {label}
            {props.required && <span className="text-danger mr-1">*</span>}
          </label>
        )}
        <select
          className={cn(
            'w-full px-4 py-2.5 border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors bg-glass backdrop-blur-glass text-content-primary',
            error && 'border-danger focus:ring-danger/40',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-canvas text-content-muted">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-canvas text-content-primary">
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-danger-light">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
