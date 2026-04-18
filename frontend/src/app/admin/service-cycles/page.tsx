'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import {
  ReserveServiceCycle,
  ReserveServiceCycleStatus,
  SERVICE_CYCLE_STATUS_LABELS,
} from '@/types';

export default function AdminServiceCyclesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCycle, setEditingCycle] = useState<ReserveServiceCycle | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [status, setStatus] = useState<ReserveServiceCycleStatus>('PLANNED');

  // City autocomplete state
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<{ name: string; englishName: string }[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isGeocodingCity, setIsGeocodingCity] = useState(false);
  const cityInputRef = useRef<HTMLDivElement>(null);

  // Debounced city search
  useEffect(() => {
    if (cityQuery.length < 1) {
      setCitySuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/geo/cities?q=${encodeURIComponent(cityQuery)}`);
        setCitySuggestions(res.data);
        setShowCitySuggestions(true);
      } catch {
        setCitySuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectCity = async (cityName: string) => {
    setLocation(cityName);
    setCityQuery(cityName);
    setShowCitySuggestions(false);
    setIsGeocodingCity(true);
    try {
      const res = await api.get(`/geo/geocode?city=${encodeURIComponent(cityName)}`);
      if (res.data && res.data.lat) {
        setLocationLat(res.data.lat);
        setLocationLng(res.data.lng);
      }
    } catch {
      // Geocoding failed — location saved without coordinates
    } finally {
      setIsGeocodingCity(false);
    }
  };

  const { data: cycles, isLoading } = useQuery<ReserveServiceCycle[]>({
    queryKey: ['service-cycles'],
    queryFn: async () => {
      const response = await api.get('/service-cycles');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/service-cycles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-cycles'] });
      toast.success('סבב מילואים נוצר בהצלחה');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה ביצירת סבב');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/service-cycles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-cycles'] });
      toast.success('סבב מילואים עודכן בהצלחה');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה בעדכון סבב');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/service-cycles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-cycles'] });
      toast.success('סבב מילואים נמחק');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה במחיקת סבב');
    },
  });

  const initializeAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/service-cycles/${id}/initialize-attendance`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`נוצרו ${data.created} רשומות נוכחות`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'שגיאה באתחול רשומות');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setLocationLat(null);
    setLocationLng(null);
    setCityQuery('');
    setStatus('PLANNED');
    setShowForm(false);
    setEditingCycle(null);
  };

  const startEditing = (cycle: ReserveServiceCycle) => {
    setEditingCycle(cycle);
    setName(cycle.name);
    setDescription(cycle.description || '');
    setStartDate(cycle.startDate.split('T')[0]);
    setEndDate(cycle.endDate?.split('T')[0] || '');
    setLocation(cycle.location || '');
    setCityQuery(cycle.location || '');
    setLocationLat(cycle.locationLat ?? null);
    setLocationLng(cycle.locationLng ?? null);
    setStatus(cycle.status);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      name,
      description: description || undefined,
      startDate,
      endDate: endDate || undefined,
      location: location || undefined,
      locationLat: locationLat ?? undefined,
      locationLng: locationLng ?? undefined,
      status,
    };

    if (editingCycle) {
      updateMutation.mutate({ id: editingCycle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (cycleStatus: ReserveServiceCycleStatus) => {
    const colors: Record<ReserveServiceCycleStatus, string> = {
      PLANNED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[cycleStatus]}`}>
        {SERVICE_CYCLE_STATUS_LABELS[cycleStatus]}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-military-700">ניהול סבבי מילואים</h1>
          <p className="text-gray-600">יצירה וניהול של סבבי מילואים</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          סבב חדש
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            {editingCycle ? 'עריכת סבב מילואים' : 'יצירת סבב מילואים חדש'}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="שם הסבב"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="מילטק – אילת – מרץ 2026"
                  required
                />
                <div ref={cityInputRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">מיקום</label>
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      setLocation(e.target.value);
                      setLocationLat(null);
                      setLocationLng(null);
                    }}
                    onFocus={() => cityQuery.length >= 1 && citySuggestions.length > 0 && setShowCitySuggestions(true)}
                    placeholder="הקלד שם עיר..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-military-500"
                  />
                  {isGeocodingCity && (
                    <span className="absolute left-3 top-9 text-xs text-gray-400">מאתר מיקום...</span>
                  )}
                  {locationLat && (
                    <span className="absolute left-3 top-9 text-xs text-green-600">✓ מיקום נמצא</span>
                  )}
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {citySuggestions.map((city, i) => (
                        <button
                          key={i}
                          type="button"
                          className="w-full px-3 py-2 text-right text-sm hover:bg-gray-100 flex justify-between items-center"
                          onClick={() => selectCity(city.name)}
                        >
                          <span className="font-medium">{city.name}</span>
                          <span className="text-xs text-gray-400">{city.englishName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  label="תאריך התחלה"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <Input
                  label="תאריך סיום"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Select
                  label="סטטוס"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReserveServiceCycleStatus)}
                  options={Object.entries(SERVICE_CYCLE_STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תיאור הסבב..."
                  className="w-full p-3 border rounded-lg resize-none h-20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {editingCycle ? 'עדכן' : 'צור סבב'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cycles List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : cycles && cycles.length > 0 ? (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-military-700">{cycle.name}</h3>
                      {getStatusBadge(cycle.status)}
                    </div>
                    {cycle.description && (
                      <p className="text-gray-600 text-sm mb-2">{cycle.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(cycle.startDate).toLocaleDateString('he-IL')}
                        {cycle.endDate && (
                          <> - {new Date(cycle.endDate).toLocaleDateString('he-IL')}</>
                        )}
                      </span>
                      {cycle.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {cycle.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {cycle._count?.attendances || 0} חיילים
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cycle.status === 'ACTIVE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => initializeAttendanceMutation.mutate(cycle.id)}
                        title="אתחל רשומות נוכחות"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    )}
                    {cycle.status === 'PLANNED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({ id: cycle.id, data: { status: 'ACTIVE' } })
                        }
                        title="הפעל סבב"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    {cycle.status === 'ACTIVE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          updateMutation.mutate({ id: cycle.id, data: { status: 'COMPLETED' } })
                        }
                        title="סיים סבב"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => startEditing(cycle)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm('האם למחוק את הסבב?')) {
                          deleteMutation.mutate(cycle.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">אין סבבי מילואים</h2>
            <p className="text-gray-500 mb-4">צור סבב מילואים חדש כדי להתחיל</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 ml-2" />
              סבב חדש
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
