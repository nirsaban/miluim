'use client';

import { Fragment } from 'react';
import { X, Phone, User, Building2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatUser {
  id: string;
  fullName: string;
  phone: string;
  department?: { name: string } | null;
  armyNumber?: string;
  personalId?: string;
  // Optional additional info
  additionalInfo?: string;
}

interface StatUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: StatUser[];
  emptyMessage?: string;
  /** Icon to display in the header */
  icon?: React.ReactNode;
  /** Color theme for the header */
  headerColorClass?: string;
}

export function StatUsersModal({
  isOpen,
  onClose,
  title,
  users,
  emptyMessage = 'אין חיילים להצגה',
  icon,
  headerColorClass = 'bg-military-50 text-military-700',
}: StatUsersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-screen items-end sm:items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal Panel - bottom sheet on mobile, centered modal on desktop */}
        <div
          className={cn(
            'relative bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-xl transform transition-all',
            'max-h-[85vh] sm:max-h-[80vh] flex flex-col'
          )}
        >
          {/* Header */}
          <div className={cn('flex items-center justify-between p-4 border-b border-gray-100 rounded-t-2xl sm:rounded-t-xl', headerColorClass)}>
            <div className="flex items-center gap-3">
              {icon || <Users className="w-5 h-5" />}
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm opacity-80">{users.length} חיילים</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-3 text-gray-300" />
                <p>{emptyMessage}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-military-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {user.fullName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          {user.armyNumber && (
                            <span>מ.א: {user.armyNumber}</span>
                          )}
                          {user.department?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {user.department.name}
                            </span>
                          )}
                          {user.additionalInfo && (
                            <span className="text-military-600 font-medium">
                              {user.additionalInfo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`tel:${user.phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">התקשר</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - mobile swipe indicator */}
          <div className="sm:hidden flex justify-center py-2 border-t border-gray-100">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
