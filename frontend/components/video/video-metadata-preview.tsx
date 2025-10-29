'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ThumbsUp, Clock, Play, Check } from 'lucide-react';

interface VideoMetadata {
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_seconds: number;
  duration_formatted: string;
  channel_name: string;
  channel_id: string;
  channel_thumbnail?: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
}

interface VideoMetadataPreviewProps {
  metadata: VideoMetadata;
  onCancel: () => void;
  onCreate: (editedMetadata: VideoMetadata, customThumbnail?: string) => void;
}

export function VideoMetadataPreview({ 
  metadata, 
  onCancel, 
  onCreate 
}: VideoMetadataPreviewProps) {
  const [loading, setLoading] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(metadata);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header minimalista */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          disabled={loading}
        >
          ← Voltar
        </Button>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Vídeo Encontrado</span>
        </div>
      </div>

      {/* Layout em grid - thumbnail à esquerda, info à direita */}
      <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
        {/* Coluna esquerda - Preview do vídeo */}
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl group cursor-pointer border border-white/5 hover:border-white/10 transition-all">
            <div className="aspect-video relative bg-black/20">
              <Image
                src={metadata.thumbnail_url}
                alt={metadata.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/80 transition-all flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-full group-hover:scale-110 group-hover:bg-white transition-all shadow-2xl">
                  <Play className="h-8 w-8 text-gray-900 fill-gray-900 ml-1" />
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-semibold border border-white/10">
                {metadata.duration_formatted}
              </div>
            </div>
          </div>

          {/* Título e canal - Estilo YouTube */}
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-gray-900 leading-snug">
              {metadata.title}
            </h1>
            
            {/* Métricas inline estilo YouTube */}
            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {formatNumber(metadata.view_count)}
              </span>
              <span className="text-gray-400">•</span>
              <span className="flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4" />
                {formatNumber(metadata.like_count)}
              </span>
              <span className="text-gray-400">•</span>
              <span>{new Date(metadata.published_at).toLocaleDateString('pt-BR')}</span>
            </div>

            {/* Canal - Estilo YouTube */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
              {metadata.channel_thumbnail ? (
                <Image
                  src={metadata.channel_thumbnail}
                  alt={metadata.channel_name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-semibold text-base">
                  {metadata.channel_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{metadata.channel_name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita - Ação */}
        <div className="space-y-6">
          {/* Botão de ação */}
          <Button 
            onClick={handleCreate}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-base font-semibold shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando vídeo...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                Adicionar Vídeo
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
