'use client';

import { useDraggable } from '@dnd-kit/core';
import { User, Shield } from 'lucide-react';
import { AvailableSoldier, ROLE_LABELS } from '@/types';

interface SoldierCardProps {
  soldier: AvailableSoldier;
  isDraggable?: boolean;
  isDragging?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
}

export function SoldierCard({
  soldier,
  isDraggable = false,
  isDragging = false,
  showRemove = false,
  onRemove,
}: SoldierCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: soldier.id,
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      style={style}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`
        bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing
        transition-shadow hover:shadow-md
        ${isDragging ? 'shadow-lg opacity-90 ring-2 ring-military-400' : ''}
        ${!isDraggable ? 'cursor-default' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-military-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{soldier.fullName}</div>
          <div className="text-xs text-gray-500">{ROLE_LABELS[soldier.role]}</div>
          {soldier.skills && soldier.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {soldier.skills.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                >
                  <Shield className="w-3 h-3" />
                  {s.skill?.displayName}
                </span>
              ))}
              {soldier.skills.length > 3 && (
                <span className="text-xs text-gray-400">+{soldier.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>
        {showRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
