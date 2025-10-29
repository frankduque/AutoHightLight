'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { VideoUrlInput } from '@/components/video/video-upload';
import { VideoMetadataPreview } from '@/components/video/video-metadata-preview';
import { videoService } from '@/services/videoService';
import { toast } from 'sonner';

interface VideoMetadata {
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_seconds: number;
  duration_formatted: string;
  channel_name: string;
  channel_id: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
}

type Step = 'input' | 'preview' | 'processing';

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const handleMetadataFetched = (fetchedMetadata: VideoMetadata) => {
    setMetadata(fetchedMetadata);
    setStep('preview');
  };

  const handleCancel = () => {
    setMetadata(null);
    setStep('input');
  };

  const handleCreate = async (editedMetadata: VideoMetadata, customThumbnail?: string) => {
    try {
      const videoData = {
        youtube_id: editedMetadata.youtube_id,
        title: editedMetadata.title,
        description: editedMetadata.description,
        thumbnail_url: customThumbnail || editedMetadata.thumbnail_url,
        duration_seconds: editedMetadata.duration_seconds,
        channel_name: editedMetadata.channel_name,
        channel_id: editedMetadata.channel_id || '',
        channel_thumbnail: editedMetadata.channel_thumbnail || '',
        view_count: editedMetadata.view_count,
        like_count: editedMetadata.like_count,
        comment_count: editedMetadata.comment_count,
        published_at: new Date(editedMetadata.published_at).toISOString()
      };

      const createdVideo = await videoService.create(videoData);
      
      // Verifica se o vídeo já existia (status diferente de 'pending')
      if (createdVideo.status !== 'pending') {
        toast.info('Vídeo já existe no banco de dados!');
      } else {
        toast.success('Vídeo adicionado com sucesso!');
      }
      
      // Redireciona para a página específica do vídeo
      window.location.href = `/videos/${createdVideo.id}`;
    } catch (error: any) {
      toast.error('Erro ao processar vídeo. Tente novamente.');
      console.error(error);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        {step === 'input' && (
          <VideoUrlInput onMetadataFetched={handleMetadataFetched} />
        )}

        {step === 'preview' && metadata && (
          <VideoMetadataPreview
            metadata={metadata}
            onCancel={handleCancel}
            onCreate={handleCreate}
          />
        )}
      </div>
    </PageContainer>
  );
}

