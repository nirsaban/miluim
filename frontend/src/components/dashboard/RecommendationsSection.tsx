'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { Recommendation, RecommendationCategory } from '@/types';
import { formatRelativeTime, cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  RESTAURANT: 'מסעדה',
  ACTIVITY: 'פעילות',
  SERVICE: 'שירות',
  OTHER: 'אחר',
};

export function RecommendationsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRecommendation, setNewRecommendation] = useState('');
  const [category, setCategory] = useState<RecommendationCategory>('RESTAURANT');
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const response = await api.get('/recommendations?limit=10');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { content: string; category: RecommendationCategory }) => {
      const response = await api.post('/recommendations', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('ההמלצה נוספה בהצלחה');
      setIsModalOpen(false);
      setNewRecommendation('');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
    onError: () => {
      toast.error('שגיאה בהוספת ההמלצה');
    },
  });

  const currentRecommendation = recommendations?.[currentIndex];

  const goNext = () => {
    if (recommendations && currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            <span>המלצות חיילים</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 ml-1" />
            הוסף
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                <div className="flex items-start justify-between mb-2">
                  <span className="px-2 py-1 bg-military-100 text-military-700 rounded text-xs font-medium">
                    {CATEGORY_LABELS[currentRecommendation!.category]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(currentRecommendation!.createdAt)}
                  </span>
                </div>
                <p className="text-gray-700">{currentRecommendation!.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  — {currentRecommendation!.user.fullName}
                </p>
              </div>

              {recommendations.length > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      currentIndex === 0
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-military-600 hover:bg-military-100'
                    )}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {recommendations.length}
                  </span>

                  <button
                    onClick={goNext}
                    disabled={currentIndex === recommendations.length - 1}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      currentIndex === recommendations.length - 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-military-600 hover:bg-military-100'
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">אין המלצות</p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="הוסף המלצה"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">קטגוריה</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RecommendationCategory)}
              className="input"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">ההמלצה שלך</label>
            <textarea
              value={newRecommendation}
              onChange={(e) => setNewRecommendation(e.target.value)}
              placeholder="שתף המלצה..."
              className="input min-h-[100px] resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => createMutation.mutate({ content: newRecommendation, category })}
              isLoading={createMutation.isPending}
              disabled={!newRecommendation.trim()}
              className="flex-1"
            >
              שלח המלצה
            </Button>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
