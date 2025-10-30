'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';

export default function VideoRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      redirectToCurrentPhase(Number(params.id));
    }
  }, [params.id]);

  const redirectToCurrentPhase = async (id: number) => {
    try {
      const video = await videoService.get(id);
      
      console.log('🔍 Redirecionamento:', {
        status: video.status,
        download_reviewed_at: video.download_reviewed_at
      });
      
      // Redireciona para a fase atual baseado no status
      // Inclui 'pending' e casos com erro de download para permitir retry
      if (['pending', 'downloading', 'downloaded', 'download_failed'].includes(video.status) && !video.download_reviewed_at) {
        console.log('✅ Redirecionando para /download');
        router.push(`/videos/${id}/download`);
      } else if (video.download_reviewed_at) {
        // Download foi revisado, redireciona para transcrição
        console.log('✅ Redirecionando para /transcription');
        router.push(`/videos/${id}/transcription`);
      } else {
        console.log('❌ Status não reconhecido, voltando para lista');
        router.push('/videos');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar vídeo:', error);
      router.push('/videos');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
