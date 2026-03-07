'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ChevronRight, ChevronLeft, Plus, Upload } from 'lucide-react';
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

  const goNext = () => {
    if (posts && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
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
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 ml-1" />
            העלה
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : posts && posts.length > 0 ? (
            <div>
              <div className="relative h-48 rounded-lg overflow-hidden bg-gray-200">
                <Image
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${currentPost!.imageUrl}`}
                  alt="תמונת גלריה"
                  fill
                  className="object-cover"
                />
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
                    {currentIndex + 1} / {posts.length}
                  </span>

                  <button
                    onClick={goNext}
                    disabled={currentIndex === posts.length - 1}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      currentIndex === posts.length - 1
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
            <p className="text-center text-gray-500 py-4">אין תמונות בגלריה</p>
          )}
        </CardContent>
      </Card>

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
