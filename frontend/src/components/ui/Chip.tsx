'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'urgent' | 'confirmed' | 'neutral' | 'accent';
  dot?: boolean;
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant = 'neutral', dot = true, children, ...props }, ref) => {
    const variants = {
      pending: 'chip--pending',
      urgent: 'chip--urgent',
      confirmed: 'chip--confirmed',
      neutral: 'chip--neutral',
      accent: 'chip--accent',
    };

    return (
      <span
        ref={ref}
        className={cn('chip', variants[variant], className)}
        {...props}
      >
        {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
        {children}
      </span>
    );
  }
);

Chip.displayName = 'Chip';

export { Chip };
