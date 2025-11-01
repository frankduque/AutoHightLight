'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { ProgressBreadcrumb } from '@/components/ui/progress-breadcrumb';
import { Play, Loader2, AlertCircle, CheckCircle2, Music } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: number;
  youtube_id: string;
  title: string;
  status: string;
  audio_path?: string;
  audio_extraction_progress?: number;
  audio_extraction_error?: string;
  audio_reviewed_at?: string;
}

export default function AudioExtractionPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  // Polling para atualizar progresso durante a extração
  useEffect(() => {
    if (!video || video.status !== 'extracting_audio') return;

    const interval = setInterval(() => {
      loadVideo(Number(params.id));
    }, 2000); // Atualiza a cada 2 segundos

    return () => clearInterval(interval);
  }, [video?.status, params.id]);

  const loadVideo = async (id: number) => {
    try {
      const data = await videoService.get(id);
      setVideo(data);
      
      // Atualiza o progresso se disponível
      if (data.audio_extraction_progress) {
        setProgress(data.audio_extraction_progress);
      }

      if (!data.download_reviewed_at) {
        toast.error("Complete o download primeiro");
        router.push(`/videos/${id}/download`);
        return;
      }

      if (data.status === "extracting_audio") {
        setExtracting(true);
      } else if (data.status === "audio_extracted") {
        setExtracting(false);
        setProgress(100);
      }
    } catch (error) {
      toast.error("Erro ao carregar vídeo");
      router.push("/videos");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExtraction = async () => {
    if (!video) return;

    setExtracting(true);
    try {
      await videoService.extractAudio(video.id);
      toast.success("Extração de áudio iniciada!");
      setVideo({...video, status: 'extracting_audio'});
    } catch (error: any) {
      setExtracting(false);
      toast.error(error.response?.data?.detail || "Erro ao iniciar extração");
    }
  };

  const handleConfirmAudio = async () => {
    if (!video) return;

    try {
      await videoService.reviewAudio(video.id);
      toast.success("Áudio confirmado!");
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(`/videos/${video.id}/transcription/transcribe`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao confirmar áudio");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="space-y-6">
      <ProgressBreadcrumb 
        currentStep={2}
        steps={[
          { label: 'Download' },
          { label: 'Extrair Áudio' },
          { label: 'Transcrição' },
          { label: 'Análise IA' },
          { label: 'Highlights' },
          { label: 'Corte' },
          { label: 'Ranking' },
          { label: 'Legendas' },
        ]}
      />

      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Music className="w-8 h-8" />
          <div>
            <div className="text-sm opacity-90">Fase 3A</div>
            <h1 className="text-3xl font-bold">Extração de Áudio</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {video.status === "downloaded" && !video.audio_path && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Extrair Áudio do Vídeo</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Vamos separar o áudio do vídeo usando ffmpeg. Este processo é rápido.
            </p>
            <Button
              onClick={handleStartExtraction}
              disabled={extracting}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500"
            >
              {extracting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Extrair Áudio
                </>
              )}
            </Button>
          </div>
        )}

        {video.status === "extracting_audio" && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Extraindo Áudio...</h2>
            <div className="max-w-md mx-auto mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{progress.toFixed(1)}% concluído</p>
            </div>
            <p className="text-gray-600">Aguarde alguns instantes</p>
          </div>
        )}

        {video.status === "audio_extraction_failed" && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Erro na Extração</h2>
            {video.audio_extraction_error && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <p className="text-sm text-red-800 font-mono">{video.audio_extraction_error}</p>
              </div>
            )}
            <Button onClick={handleStartExtraction} variant="outline">
              <Play className="w-5 h-5 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}

        {video.status === "audio_extracted" && (
          <div className="space-y-8">
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Áudio Extraído com Sucesso!</h2>
              <p className="text-gray-600 mb-4">Ouça o áudio extraído antes de prosseguir</p>
            </div>

            {/* Audio Player */}
            <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Áudio Extraído</h3>
                  <p className="text-sm text-gray-600">MP3 • {Math.floor(video.duration_seconds / 60)}min</p>
                </div>
              </div>
              
              <audio 
                controls 
                className="w-full"
                preload="metadata"
                src={`http://localhost:8001/api/videos/${video.id}/audio-stream`}
              >
                Seu navegador não suporta o elemento de áudio.
              </audio>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Verifique se o áudio está correto antes de iniciar a transcrição
              </p>
            </div>

            <div className="text-center">
              <Button
                onClick={handleConfirmAudio}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-600 to-green-500"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar e Transcrever
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}