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
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-gray-500' },
  downloading: { label: 'Baixando', color: 'bg-blue-500' },
  downloaded: { label: 'Baixado', color: 'bg-green-500' },
  processing: { label: 'Processando', color: 'bg-yellow-500' },
  completed: { label: 'Concluído', color: 'bg-emerald-500' },
  failed: { label: 'Erro', color: 'bg-red-500' },
};

export function VideoCard({ video, onUpdate }: VideoCardProps) {
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

  return (
    <Link href={`/videos/${video.id}`}>
      <Card className="group overflow-hidden hover:shadow-2xl transition-all border-gray-200 hover:border-blue-400 cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-black/5">
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-medium">
            {formatDuration(video.duration_seconds)}
          </div>
          <Badge className={`absolute top-2 left-2 ${status.color} text-white border-none shadow-lg`}>
            {status.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Título */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
            {video.title}
          </h3>

          {/* Canal */}
          <div className="flex items-center gap-2">
            {video.channel_thumbnail ? (
              <Image
                src={video.channel_thumbnail}
                alt={video.channel_name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                {video.channel_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-600 truncate">{video.channel_name}</span>
          </div>

          {/* Métricas */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {formatNumber(video.view_count)}
            </span>
            <span className="flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" />
              {formatNumber(video.like_count)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
