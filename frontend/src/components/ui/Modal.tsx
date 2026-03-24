'use client';

import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-overlay transition-opacity"
          onClick={onClose}
        />
        <div
          className={cn(
            'relative bg-glass backdrop-blur-glass-lg rounded-card border border-border shadow-card w-full p-6 transform transition-all',
            sizes[size]
          )}
        >
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 className="text-lg font-bold text-content-primary">{title}</h3>
            )}
            <button
              onClick={onClose}
              className="text-content-muted hover:text-content-primary hover:bg-surface-2 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
