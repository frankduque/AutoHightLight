'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Loader2 } from 'lucide-react';

export default function TranscriptionRedirectPage() {
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
      
      console.log('🔍 Redirecionamento Transcrição:', {
        status: video.status,
        download_reviewed: video.download_reviewed_at,
        audio_reviewed: video.audio_reviewed_at,
        transcription_reviewed: video.transcription_reviewed_at
      });
      
      // Se download não foi revisado, volta para download
      if (!video.download_reviewed_at) {
        console.log('→ Redirecionando para /download');
        router.push(`/videos/${id}/download`);
        return;
      }
      
      // Se áudio não foi extraído ou revisado, vai para extração de áudio
      if (!video.audio_reviewed_at) {
        console.log('→ Redirecionando para /audio-extraction');
        router.push(`/videos/${id}/transcription/audio-extraction`);
        return;
      }
      
      // Se áudio foi revisado mas não transcreveu, vai para transcrição
      if (!video.transcription_reviewed_at) {
        console.log('→ Redirecionando para /transcribe');
        router.push(`/videos/${id}/transcription/transcribe`);
        return;
      }
      
      // Se tudo foi revisado, volta para lista
      console.log('→ Transcrição completa, voltando para lista');
      router.push('/videos');
      
    } catch (error) {
      console.error('❌ Erro ao buscar vídeo:', error);
      router.push('/videos');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}

