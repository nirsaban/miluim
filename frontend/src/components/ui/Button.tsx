'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-accent text-app hover:bg-accent-hover active:bg-accent-active focus:ring-accent/40 shadow-glow-sm hover:shadow-glow',
      secondary: 'bg-transparent border border-accent text-content-secondary hover:bg-accent/10 hover:text-content-primary focus:ring-accent/40',
      danger: 'bg-danger text-white hover:bg-danger-light focus:ring-danger/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
      outline: 'border border-accent text-accent hover:bg-accent/10 focus:ring-accent/40',
      ghost: 'text-content-secondary hover:bg-glass hover:text-content-primary focus:ring-accent/40',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-2.5 text-base min-h-[44px]',
      lg: 'px-6 py-3 text-lg min-h-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed tracking-wide',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
