'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Phone, Building2, User } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

export default function FriendsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await api.get('/users/contacts');
      return response.data;
    },
  });

  const filteredFriends = friends?.filter((friend) => {
    const matchesSearch =
      friend.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.phone.includes(searchTerm);

    const matchesRole = !roleFilter || friend.militaryRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const roleOptions = [
    { value: '', label: 'כל התפקידים' },
    ...Object.entries(MILITARY_ROLE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <UserLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-military-700">חברים</h1>
        <p className="text-gray-600 mt-1">רשימת אנשי קשר בפלוגה</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Friends List */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Users className="w-5 h-5 text-military-600" />
          <span>אנשי קשר</span>
          <span className="text-sm text-gray-500">({filteredFriends?.length || 0})</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : filteredFriends && filteredFriends.length > 0 ? (
            <div className="space-y-3">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-military-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-military-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{friend.fullName}</div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {friend.militaryRole && (
                          <span className="px-2 py-0.5 bg-military-100 text-military-700 rounded text-xs">
                            {MILITARY_ROLE_LABELS[friend.militaryRole]}
                          </span>
                        )}
                        {friend.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
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
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">וואטסאפ</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">לא נמצאו אנשי קשר</p>
          )}
        </CardContent>
      </Card>
    </UserLayout>
  );
}
