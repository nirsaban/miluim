'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  title: string;
  content: string;
  priority?: string;
  type?: string;
  createdAt: string;
}

interface MessageCarouselProps {
  messages: Message[];
  autoSlide?: boolean;
  autoSlideInterval?: number;
  renderItem: (message: Message) => React.ReactNode;
  className?: string;
}

export function MessageCarousel({
  messages,
  autoSlide = true,
  autoSlideInterval = 5000,
  renderItem,
  className,
}: MessageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sortedMessages.length);
  }, [sortedMessages.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sortedMessages.length) % sortedMessages.length);
  }, [sortedMessages.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (!autoSlide || isHovered || sortedMessages.length <= 1) return;

    const timer = setInterval(goToNext, autoSlideInterval);
    return () => clearInterval(timer);
  }, [autoSlide, autoSlideInterval, goToNext, isHovered, sortedMessages.length]);

  if (sortedMessages.length === 0) {
    return null;
  }

  if (sortedMessages.length === 1) {
    return (
      <div className={className}>
        {renderItem(sortedMessages[0])}
      </div>
    );
  }

  return (
    <div
      className={cn('relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Message Content with Animation */}
      <div className="overflow-hidden">
        <div
          className="transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${currentIndex * 100}%)` }}
        >
          <div className="flex" style={{ width: `${sortedMessages.length * 100}%` }}>
            {sortedMessages.map((message, index) => (
              <div
                key={message.id}
                className="w-full flex-shrink-0"
                style={{ width: `${100 / sortedMessages.length}%` }}
              >
                {renderItem(message)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {sortedMessages.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 p-1.5 bg-surface-2/90 border border-border-subtle rounded-full shadow-md hover:bg-elevated transition-colors z-10"
            aria-label="הודעה קודמת"
          >
            <ChevronRight className="w-4 h-4 text-content-secondary" />
          </button>
          <button
            onClick={goToNext}
            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 p-1.5 bg-surface-2/90 border border-border-subtle rounded-full shadow-md hover:bg-elevated transition-colors z-10"
            aria-label="הודעה הבאה"
          >
            <ChevronLeft className="w-4 h-4 text-content-secondary" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sortedMessages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {sortedMessages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-200',
                index === currentIndex
                  ? 'bg-accent w-4'
                  : 'bg-border hover:bg-border-strong'
              )}
              aria-label={`עבור להודעה ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="absolute bottom-0 left-0 text-xs text-content-muted bg-surface/80 px-2 py-0.5 rounded">
        {currentIndex + 1} / {sortedMessages.length}
      </div>
    </div>
  );
}
