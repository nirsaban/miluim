'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronRight, ChevronLeft, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { ShiftPost, SHIFT_TYPE_LABELS } from '@/types';
import { formatDate, cn } from '@/lib/utils';

export function ShiftsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: shifts, isLoading } = useQuery<ShiftPost[]>({
    queryKey: ['shifts-latest'],
    queryFn: async () => {
      const response = await api.get('/shifts/latest?limit=5');
      return response.data;
    },
  });

  const currentShift = shifts?.[currentIndex];

  const goNext = () => {
    if (shifts && currentIndex < shifts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        <span>סידור משמרות</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : shifts && shifts.length > 0 ? (
          <div>
            <div className="relative">
              {currentShift?.imageUrl && (
                <div
                  className="relative h-48 mb-4 rounded-lg overflow-hidden bg-gray-200 cursor-pointer group"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Image
                    src={currentShift.imageUrl}
                    alt="סידור משמרות"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">תאריך</span>
                  <span className="font-bold">
                    {formatDate(currentShift!.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">סוג משמרת</span>
                  <span className="px-2 py-1 bg-military-100 text-military-700 rounded text-sm font-medium">
                    {SHIFT_TYPE_LABELS[currentShift!.shiftType]}
                  </span>
                </div>
                {currentShift?.message && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600">{currentShift.message}</p>
                  </div>
                )}
              </div>
            </div>

            {shifts.length > 1 && (
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

                <div className="flex gap-1">
                  {shifts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        index === currentIndex
                          ? 'bg-military-600'
                          : 'bg-gray-300'
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  disabled={currentIndex === shifts.length - 1}
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    currentIndex === shifts.length - 1
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
          <p className="text-center text-gray-500 py-4">אין סידור משמרות</p>
        )}
      </CardContent>

      {/* Fullscreen Image Modal */}
      {isFullscreen && currentShift?.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <Image
              src={currentShift.imageUrl}
              alt="סידור משמרות"
              fill
              className="object-contain"
              unoptimized
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
            <p className="text-lg font-bold">{formatDate(currentShift.date)}</p>
            <p className="text-sm opacity-75">לחץ במקום כלשהו לסגירה</p>
          </div>
        </div>
      )}
    </Card>
  );
}
