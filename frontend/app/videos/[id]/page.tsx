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
        download_reviewed_at: video.download_reviewed_at,
        audio_reviewed_at: video.audio_reviewed_at,
        transcription_reviewed_at: video.transcription_reviewed_at
      });
      
      // Redireciona para a fase atual baseado no status e revisões
      
      // Fase 1: Download
      if (!video.download_reviewed_at) {
        console.log('✅ Redirecionando para /download');
        router.push(`/videos/${id}/download`);
        return;
      }
      
      // Fase 2: Extração de Áudio
      if (!video.audio_reviewed_at) {
        console.log('✅ Redirecionando para /transcription/audio-extraction');
        router.push(`/videos/${id}/transcription/audio-extraction`);
        return;
      }
      
      // Fase 3: Transcrição
      if (!video.transcription_reviewed_at) {
        console.log('✅ Redirecionando para /transcription/transcribe');
        router.push(`/videos/${id}/transcription/transcribe`);
        return;
      }
      
      // Fase 4+: Análise IA (próxima fase a ser implementada)
      console.log('✅ Redirecionando para /analysis');
      router.push(`/videos/${id}/analysis`);
      
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
