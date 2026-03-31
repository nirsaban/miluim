'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ClickableStatCardProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Wrapper component that makes stat cards clickable
 * When clicked, it opens a modal showing the users that make up the statistic
 */
export function ClickableStatCard({
  children,
  onClick,
  disabled = false,
  className,
}: ClickableStatCardProps) {
  const isClickable = onClick && !disabled;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        'transition-all duration-200',
        isClickable && [
          'cursor-pointer',
          'hover:scale-[1.02]',
          'hover:shadow-lg',
          'active:scale-[0.98]',
          'select-none',
        ],
        !isClickable && 'cursor-default',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
