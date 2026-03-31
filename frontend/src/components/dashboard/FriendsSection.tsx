'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, Search, Phone, Building2, User, ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { formatWhatsAppLink } from '@/lib/utils';
import { MilitaryRole, MILITARY_ROLE_LABELS } from '@/types';

interface Friend {
  id: string;
  fullName: string;
  phone: string;
  militaryRole?: MilitaryRole;
  department?: {
    name: string;
  };
}

interface FriendsSectionProps {
  className?: string;
  limit?: number;
}

export function FriendsSection({ className, limit = 5 }: FriendsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/users/contacts');
      return response.data;
    },
  });

  const filteredFriends = friends?.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.phone.includes(searchTerm)
  );

  const displayFriends = filteredFriends?.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-military-600" />
          <span>חברים</span>
          <span className="text-sm text-gray-500">({friends?.length || 0})</span>
        </div>
        <Link
          href="/dashboard/friends"
          className="text-sm text-military-600 hover:text-military-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-military-100 transition-colors"
        >
          כולם
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="חיפוש..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Friends List */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : displayFriends && displayFriends.length > 0 ? (
          <div className="space-y-2">
            {displayFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-military-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-military-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{friend.fullName}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {friend.militaryRole && (
                        <span className="px-1.5 py-0.5 bg-military-100 text-military-700 rounded">
                          {MILITARY_ROLE_LABELS[friend.militaryRole]}
                        </span>
                      )}
                      {friend.department && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          {friend.department.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={formatWhatsAppLink(friend.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex-shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-6 text-sm">לא נמצאו אנשי קשר</p>
        )}

        {/* Show more link if there are more friends */}
        {filteredFriends && filteredFriends.length > limit && (
          <Link
            href="/dashboard/friends"
            className="block mt-3 text-center text-sm text-military-600 hover:text-military-700 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            הצג עוד {filteredFriends.length - limit} אנשי קשר
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
