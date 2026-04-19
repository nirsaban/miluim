'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps extends HTMLAttributes<HTMLDivElement> {
  accentBar?: boolean;
}

const SectionTitle = forwardRef<HTMLDivElement, SectionTitleProps>(
  ({ className, accentBar = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('section-title-bar', className)}
        {...props}
      >
        {accentBar && <span className="accent-bar" />}
        {children}
      </div>
    );
  }
);

SectionTitle.displayName = 'SectionTitle';

export { SectionTitle };
