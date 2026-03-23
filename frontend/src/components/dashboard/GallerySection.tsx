'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ChevronRight, ChevronLeft, Plus, Upload, X, Maximize2, Grid3X3 } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { SocialPost } from '@/types';
import { formatRelativeTime, cn } from '@/lib/utils';

export function GallerySection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery<SocialPost[]>({
    queryKey: ['social-posts'],
    queryFn: async () => {
      const response = await api.get('/social?limit=10');
      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post('/social', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('התמונה הועלתה בהצלחה');
      setIsModalOpen(false);
      setSelectedFile(null);
      setCaption('');
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
    onError: () => {
      toast.error('שגיאה בהעלאת התמונה');
    },
  });

  const currentPost = posts?.[currentIndex];

  const goNext = useCallback(() => {
    if (posts && currentIndex < posts.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setSlideDirection('left');
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [posts, currentIndex, isAnimating]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setSlideDirection('right');
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentIndex, isAnimating]);

  // Keyboard navigation for fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
      if (e.key === 'ArrowLeft') goNext(); // RTL
      if (e.key === 'ArrowRight') goPrev(); // RTL
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, goNext, goPrev]);

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setIsFullscreen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('נא לבחור קובץ תמונה');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('גודל הקובץ מקסימלי הוא 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('נא לבחור תמונה');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (caption) {
      formData.append('caption', caption);
    }

    uploadMutation.mutate(formData);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <span>גלריית פלוגה</span>
          </div>
          <div className="flex items-center gap-1">
            {posts && posts.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGridView(!isGridView)}
                title={isGridView ? 'תצוגת קרוסלה' : 'תצוגת רשת'}
              >
                <Grid3X3 className={cn('w-4 h-4', isGridView && 'text-military-600')} />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 ml-1" />
              העלה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : posts && posts.length > 0 ? (
            <div>
              {/* Grid View */}
              {isGridView ? (
                <div className="grid grid-cols-3 gap-2">
                  {posts.map((post, index) => (
                    <button
                      key={post.id}
                      onClick={() => openFullscreen(index)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-military-500"
                    >
                      <Image
                        src={post.imageUrl}
                        alt={post.caption || 'תמונת גלריה'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              ) : (
                /* Carousel View */
                <>
                  <div
                    className="relative h-48 rounded-lg overflow-hidden bg-gray-200 cursor-pointer group"
                    onClick={() => openFullscreen(currentIndex)}
                  >
                    <div
                      className={cn(
                        'absolute inset-0 transition-all duration-200',
                        isAnimating && slideDirection === 'left' && 'animate-slide-out-left',
                        isAnimating && slideDirection === 'right' && 'animate-slide-out-right',
                        !isAnimating && 'animate-fade-in'
                      )}
                    >
                      <Image
                        src={currentPost!.imageUrl}
                        alt="תמונת גלריה"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    {/* Fullscreen hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {currentPost?.caption && (
                    <p className="mt-2 text-sm text-gray-600">{currentPost.caption}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {currentPost!.user.fullName} •{' '}
                    {formatRelativeTime(currentPost!.createdAt)}
                  </p>

                  {posts.length > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={goPrev}
                        disabled={currentIndex === 0 || isAnimating}
                        className={cn(
                          'p-2 rounded-full transition-colors',
                          currentIndex === 0 || isAnimating
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-military-600 hover:bg-military-100'
                        )}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      <span className="text-sm text-gray-500">
                        {currentIndex + 1} / {posts.length}
                      </span>

                      <button
                        onClick={goNext}
                        disabled={currentIndex === posts.length - 1 || isAnimating}
                        className={cn(
                          'p-2 rounded-full transition-colors',
                          currentIndex === posts.length - 1 || isAnimating
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-military-600 hover:bg-military-100'
                        )}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">אין תמונות בגלריה</p>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Gallery Modal */}
      {isFullscreen && posts && posts.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            aria-label="סגור"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation - Previous */}
          {posts.length > 1 && currentIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
              aria-label="הקודם"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Main Image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={posts[currentIndex].imageUrl}
              alt={posts[currentIndex].caption || 'תמונת גלריה'}
              fill
              className={cn(
                'object-contain transition-opacity duration-200',
                isAnimating ? 'opacity-50' : 'opacity-100'
              )}
              unoptimized
              priority
            />
          </div>

          {/* Navigation - Next */}
          {posts.length > 1 && currentIndex < posts.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
              aria-label="הבא"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Caption and info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {posts[currentIndex].caption && (
              <p className="text-white text-center mb-1">{posts[currentIndex].caption}</p>
            )}
            <p className="text-white/60 text-sm text-center">
              {posts[currentIndex].user.fullName} • {formatRelativeTime(posts[currentIndex].createdAt)}
            </p>
            {posts.length > 1 && (
              <p className="text-white/40 text-xs text-center mt-2">
                {currentIndex + 1} / {posts.length}
              </p>
            )}
          </div>

          {/* Thumbnail strip */}
          {posts.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg max-w-[90vw] overflow-x-auto">
              {posts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={cn(
                    'relative w-12 h-12 rounded overflow-hidden flex-shrink-0 transition-all',
                    index === currentIndex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-60 hover:opacity-100'
                  )}
                >
                  <Image
                    src={post.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          setCaption('');
        }}
        title="העלאת תמונה"
        size="md"
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-military-500 transition-colors"
          >
            {selectedFile ? (
              <div className="relative h-32 w-full">
                <Image
                  src={URL.createObjectURL(selectedFile)}
                  alt="תצוגה מקדימה"
                  fill
                  className="object-contain rounded"
                />
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600">לחץ לבחירת תמונה</p>
                <p className="text-xs text-gray-400 mt-1">עד 5MB</p>
              </>
            )}
          </div>

          <div>
            <label className="label">כיתוב (אופציונלי)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="הוסף כיתוב לתמונה..."
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleUpload}
              isLoading={uploadMutation.isPending}
              disabled={!selectedFile}
              className="flex-1"
            >
              העלה תמונה
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedFile(null);
                setCaption('');
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
