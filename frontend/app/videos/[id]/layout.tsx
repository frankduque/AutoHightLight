'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Video {
  id: number;
  youtube_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  channel_name: string;
  channel_id?: string;
  channel_thumbnail?: string;
  duration_seconds: number;
  view_count: number;
  like_count?: number;
  comment_count?: number;
  published_at?: string;
  status: string;
  download_reviewed_at?: string;
  transcription_reviewed_at?: string;
  highlights_reviewed_at?: string;
}

export default function VideoProcessLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  const loadVideo = async (id: number) => {
    try {
      setLoading(true);
      const data = await videoService.get(id);
      setVideo(data);
    } catch (error) {
      toast.error('Erro ao carregar vídeo');
      console.error(error);
      router.push('/videos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMetadata = async () => {
    if (!video) return;
    
    setRefreshing(true);
    try {
      const updatedVideo = await videoService.refreshMetadata(video.id);
      setVideo(updatedVideo);
      toast.loading('Atualizando dados do canal...', { id: 'refresh' });
      
      // Faz polling para pegar o thumbnail que está sendo buscado em background
      let attempts = 0;
      const maxAttempts = 15; // 15 segundos máximo
      
      const pollThumbnail = setInterval(async () => {
        attempts++;
        
        try {
          const freshVideo = await videoService.get(video.id);
          
          // Se encontrou o thumbnail ou atingiu o limite de tentativas
          if (freshVideo.channel_thumbnail || attempts >= maxAttempts) {
            clearInterval(pollThumbnail);
            setVideo(freshVideo);
            setRefreshing(false);
            
            if (freshVideo.channel_thumbnail) {
              toast.success('Avatar do canal atualizado!', { id: 'refresh' });
            } else {
              toast.info('Nome atualizado (avatar não encontrado)', { id: 'refresh' });
            }
          }
        } catch (error) {
          clearInterval(pollThumbnail);
          setRefreshing(false);
          toast.error('Erro no polling', { id: 'refresh' });
          console.error('Erro no polling:', error);
        }
      }, 1000); // Verifica a cada 1 segundo
      
    } catch (error) {
      toast.error('Erro ao atualizar dados do canal', { id: 'refresh' });
      console.error(error);
      setRefreshing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1800px] mx-auto">
          <Link href="/videos">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Vídeos
            </Button>
          </Link>
        </div>
      </div>

      {/* Layout com Sidebar */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Informações do Vídeo */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
              {/* Thumbnail */}
              <div className="aspect-video relative">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs font-medium px-2 py-1 rounded">
                  {formatDuration(video.duration_seconds)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-4">
                {/* Título */}
                <div>
                  <h2 className="font-bold text-gray-900 leading-tight mb-3">
                    {video.title}
                  </h2>
                </div>

                {/* Canal - Clicável */}
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.youtube.com/channel/${video.channel_id || video.youtube_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors flex-1 min-w-0"
                  >
                    {video.channel_thumbnail ? (
                      <img
                        src={video.channel_thumbnail}
                        alt={video.channel_name}
                        className="w-10 h-10 rounded-full ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-100">
                        {video.channel_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{video.channel_name}</div>
                      <div className="text-xs text-gray-500">Ver canal</div>
                    </div>
                  </a>
                  <button
                    onClick={handleRefreshMetadata}
                    disabled={refreshing}
                    className="p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Atualizar nome e avatar do canal"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500">Visualizações</div>
                    <div className="text-sm font-semibold text-gray-900">{video.view_count?.toLocaleString()}</div>
                  </div>
                  {video.like_count !== undefined && (
                    <div>
                      <div className="text-xs text-gray-500">Likes</div>
                      <div className="text-sm font-semibold text-gray-900">{video.like_count.toLocaleString()}</div>
                    </div>
                  )}
                  {video.published_at && (
                    <div>
                      <div className="text-xs text-gray-500">Publicado</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(video.published_at).toLocaleDateString('pt-BR', { 
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                {video.description && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-2 font-medium">Descrição</div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {showFullDescription 
                        ? video.description 
                        : video.description.length > 150 
                          ? video.description.substring(0, 150) + '...' 
                          : video.description
                      }
                    </p>
                    {video.description.length > 150 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1"
                      >
                        {showFullDescription ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                )}

                {/* Botão YouTube */}
                <div className="pt-3 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 justify-center" 
                    asChild
                  >
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.youtube_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Play className="w-4 h-4" />
                      Assistir no YouTube
                    </a>
                  </Button>
                </div>

                {/* Status Badge */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Status do processamento</div>
                  <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium text-center">
                    {video.status === 'pending' ? 'Aguardando download' : video.status}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <main className="col-span-12 lg:col-span-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
