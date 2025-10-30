'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ThumbsUp, Clock, Download, Trash2 } from 'lucide-react';
import { videoService } from '@/services/videoService';
import { toast } from 'sonner';

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

interface VideoCardProps {
  video: Video;
  onUpdate: () => void;
  viewMode?: 'grid' | 'list';
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando Download', color: 'bg-gray-500' },
  downloading: { label: 'Baixando', color: 'bg-blue-500' },
  downloaded: { label: 'Baixado', color: 'bg-green-500' },
  processing: { label: 'Processando', color: 'bg-yellow-500' },
  completed: { label: 'Concluído', color: 'bg-emerald-500' },
  failed: { label: 'Download Pendente', color: 'bg-amber-500' },
};

export function VideoCard({ video, onUpdate, viewMode = 'grid' }: VideoCardProps) {
  const [loading, setLoading] = useState(false);

  const formatNumber = (num: number | undefined | null) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await videoService.startDownload(video.id);
      toast.success('Download iniciado!');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao iniciar download');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Tem certeza que deseja deletar este vídeo?')) return;
    
    setLoading(true);
    try {
      await videoService.delete(video.id);
      toast.success('Vídeo deletado');
      onUpdate();
    } catch (error) {
      toast.error('Erro ao deletar vídeo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const status = statusLabels[video.status] || statusLabels.pending;

  if (viewMode === 'list') {
    return (
      <Link href={`/videos/${video.id}`}>
        <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white/80 backdrop-blur">
          <div className="flex gap-6 p-6">
            <div className="relative w-80 aspect-video overflow-hidden bg-black/5 rounded-xl flex-shrink-0 shadow-lg">
              <Image
                src={video.thumbnail_url}
                alt={video.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-3 right-3 bg-black/90 backdrop-blur text-white text-sm px-3 py-1.5 rounded-lg font-semibold">
                {formatDuration(video.duration_seconds)}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between py-2">
              <div>
                <Badge className={`${status.color} text-white border-none mb-3 px-3 py-1 text-sm font-semibold`}>
                  {status.label}
                </Badge>
                <h3 className="text-2xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-4 leading-tight">
                  {video.title}
                </h3>
                <div className="flex items-center gap-3 mb-6">
                  {video.channel_thumbnail ? (
                    <Image
                      src={video.channel_thumbnail}
                      alt={video.channel_name}
                      width={32}
                      height={32}
                      className="rounded-full ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                      {video.channel_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-base font-medium text-gray-700">{video.channel_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-base text-gray-600">
                <span className="flex items-center gap-2 font-medium">
                  <Eye className="w-5 h-5 text-gray-400" />
                  {formatNumber(video.view_count)}
                </span>
                <span className="flex items-center gap-2 font-medium">
                  <ThumbsUp className="w-5 h-5 text-gray-400" />
                  {formatNumber(video.like_count)}
                </span>
                <span className="flex items-center gap-2 font-medium text-gray-400">
                  <Clock className="w-5 h-5" />
                  {new Date(video.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/videos/${video.id}`}>
      <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-300 cursor-pointer bg-white/80 backdrop-blur">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-black/5">
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-3 right-3 bg-black/90 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-lg font-bold shadow-lg">
            {formatDuration(video.duration_seconds)}
          </div>
          <Badge className={`absolute top-3 left-3 ${status.color} text-white border-none shadow-lg px-3 py-1 text-sm font-semibold`}>
            {status.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Título */}
          <h3 className="font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors text-lg min-h-[3.5rem]">
            {video.title}
          </h3>

          {/* Canal */}
          <div className="flex items-center gap-3">
            {video.channel_thumbnail ? (
              <Image
                src={video.channel_thumbnail}
                alt={video.channel_name}
                width={28}
                height={28}
                className="rounded-full ring-2 ring-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                {video.channel_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 truncate">{video.channel_name}</span>
          </div>

          {/* Métricas */}
          <div className="flex items-center gap-5 text-sm text-gray-600 pt-2 border-t border-gray-100">
            <span className="flex items-center gap-2 font-medium">
              <Eye className="w-4 h-4 text-gray-400" />
              {formatNumber(video.view_count)}
            </span>
            <span className="flex items-center gap-2 font-medium">
              <ThumbsUp className="w-4 h-4 text-gray-400" />
              {formatNumber(video.like_count)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
