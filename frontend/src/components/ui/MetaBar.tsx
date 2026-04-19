'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface MetaBarItem {
  key: string;
  value: string;
  color?: string;
}

interface MetaBarProps extends HTMLAttributes<HTMLDivElement> {
  items: MetaBarItem[];
}

const MetaBar = forwardRef<HTMLDivElement, MetaBarProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('meta-bar', className)}
        {...props}
      >
        {items.map((item, i) => (
          <span key={item.key} className="flex items-center gap-4">
            {i > 0 && <span className="sep">{'\u2502'}</span>}
            <span className="flex items-center gap-1">
              <span className="k">{item.key}</span>
              <span className="v" style={item.color ? { color: item.color } : undefined}>
                {item.value}
              </span>
            </span>
          </span>
        ))}
      </div>
    );
  }
);

MetaBar.displayName = 'MetaBar';

export { MetaBar };
export type { MetaBarItem };
