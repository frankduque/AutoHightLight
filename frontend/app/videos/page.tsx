'use client';

import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { Plus, Video as VideoIcon } from 'lucide-react';
import { VideoCard } from '@/components/video/video-card';
import { toast } from 'sonner';
import Link from 'next/link';

interface Video {
  id: number;
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  channel_name: string;
  channel_thumbnail?: string;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  status: string;
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.list();
      setVideos(response.videos);
    } catch (error) {
      toast.error('Erro ao carregar vídeos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Vídeos</h1>
          <p className="text-gray-600 mt-1">Gerencie seus vídeos e highlights</p>
        </div>

        {/* Lista de vídeos */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600">Carregando vídeos...</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <VideoIcon className="w-10 h-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Nenhum vídeo ainda</h3>
                <p className="text-gray-600 mt-1">Adicione seu primeiro vídeo para começar</p>
              </div>
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Vídeo
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onUpdate={loadVideos} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
