'use client';

import { useEffect, useState } from 'react';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { Plus, Video as VideoIcon, Search, LayoutGrid, LayoutList, TrendingUp, Clock, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

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

  const stats = {
    total: videos.length,
    processing: videos.filter(v => ['downloading', 'transcribing', 'analyzing'].includes(v.status)).length,
    completed: videos.filter(v => v.status === 'completed').length,
    totalViews: videos.reduce((acc, v) => acc + (v.view_count || 0), 0)
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Container com mesmo padding do header */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-10">
          {/* Header Premium */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-3">
                Meus Vídeos
              </h1>
              <p className="text-lg text-gray-600">Transforme seus vídeos em highlights virais</p>
            </div>
            <Link href="/">
              <Button size="lg" className="h-14 px-8 gap-3 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white shadow-2xl shadow-blue-500/50 text-base font-semibold">
                <Plus className="w-6 h-6" />
                Novo Vídeo
              </Button>
            </Link>
          </div>

          {/* Stats Cards Premium */}
          {videos.length > 0 && (
            <div className="grid grid-cols-4 gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition"></div>
                <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-blue-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                      <VideoIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{stats.total}</div>
                  <div className="text-sm font-medium text-gray-600">Total de Vídeos</div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition"></div>
                <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-orange-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{stats.processing}</div>
                  <div className="text-sm font-medium text-gray-600">Processando</div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition"></div>
                <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-green-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">{stats.completed}</div>
                  <div className="text-sm font-medium text-gray-600">Concluídos</div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition"></div>
                <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-purple-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">0</div>
                  <div className="text-sm font-medium text-gray-600">Views em Shorts</div>
                  <div className="text-xs text-gray-400 mt-1">Após publicação</div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Controls */}
          {videos.length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por título ou canal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        viewMode === 'grid'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grade
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        viewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <LayoutList className="w-4 h-4" />
                      Lista
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-40">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xl font-semibold text-gray-700">Carregando seus vídeos...</p>
              </div>
            </div>
          ) : videos.length === 0 ? (
            <div className="flex items-center justify-center py-40">
              <div className="text-center space-y-8 max-w-xl">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-20"></div>
                  <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                    <VideoIcon className="w-16 h-16 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Comece sua jornada</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Adicione seu primeiro vídeo do YouTube e transforme-o em highlights incríveis para suas redes sociais
                  </p>
                </div>
                <Link href="/">
                  <Button size="lg" className="h-14 px-10 gap-3 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 text-white shadow-2xl shadow-blue-500/50 text-base font-semibold">
                    <Plus className="w-6 h-6" />
                    Adicionar Primeiro Vídeo
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8'
                : 'flex flex-col gap-6'
            }>
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} onUpdate={loadVideos} viewMode={viewMode} />
              ))}
            </div>
          )}

          {filteredVideos.length === 0 && videos.length > 0 && (
            <div className="text-center py-20">
              <p className="text-lg text-gray-600">Nenhum vídeo encontrado para "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
