'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  // Polling para atualizar progresso durante o download
  useEffect(() => {
    if (!video || video.status !== 'downloading') return;

    const interval = setInterval(() => {
      loadVideo(Number(params.id));
    }, 2000); // Atualiza a cada 2 segundos

    return () => clearInterval(interval);
  }, [video?.status, params.id]);

  const loadVideo = async (id: number) => {
    try {
      const data = await videoService.get(id);
      setVideo(data);

      // Permite acesso se está pending, downloading, downloaded ou download_failed (para retry)
      if (!['pending', 'downloading', 'downloaded', 'download_failed'].includes(data.status)) {
        toast.error('Esta etapa não está disponível');
        router.push(`/videos`);
      }
    } catch (error) {
      toast.error('Erro ao carregar');
      router.push('/videos');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDownload = async () => {
    if (!video) return;
    try {
      await videoService.startDownload(video.id);
      toast.success('Download iniciado!');
      setVideo({...video, status: 'downloading'});
    } catch (error) {
      toast.error('Erro ao iniciar download');
    }
  };

  const handleConfirmDownload = async () => {
    if (!video) return;
    try {
      console.log('🔄 Confirmando download para vídeo:', video.id);
      const updatedVideo = await videoService.reviewDownload(video.id);
      console.log('✅ Download confirmado:', updatedVideo);
      toast.success('Download confirmado! Avançando para transcrição...');
      // Aguarda um pouco para garantir que o BD foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      router.push(`/videos/${video.id}/transcription`);
    } catch (error: any) {
      console.error('❌ Erro ao confirmar download:', error);
      toast.error(error.response?.data?.detail || 'Erro ao confirmar download');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb de Progresso */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { num: 1, label: 'Download', active: true },
          { num: 2, label: 'Transcrição', active: false },
          { num: 3, label: 'Análise IA', active: false },
          { num: 4, label: 'Highlights', active: false },
          { num: 5, label: 'Corte', active: false },
          { num: 6, label: 'Ranking', active: false },
          { num: 7, label: 'Legendas', active: false }
        ].map((step, index) => (
          <div key={step.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              step.active 
                ? 'bg-blue-100 border-2 border-blue-500' 
                : 'bg-gray-100 border-2 border-gray-300 opacity-50'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.active ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
              }`}>
                {step.num}
              </div>
              <span className={`text-sm font-medium ${
                step.active ? 'text-blue-900' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
            {index < 6 && (
              <div className="w-4 h-0.5 bg-gray-300" />
            )}
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <Download className="w-8 h-8" />
          <div>
            <div className="text-sm opacity-90">Etapa 1 de 7</div>
            <h1 className="text-3xl font-bold">Download do Vídeo</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {video.status === 'pending' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Aguardando Download</h2>
            <p className="text-gray-600 mb-8">O vídeo será baixado em alta qualidade.</p>
            <Button
              onClick={handleStartDownload}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8"
            >
              <Download className="w-5 h-5" />
              Iniciar Download
            </Button>
          </div>
        )}

        {video.status === 'downloading' && (
          <div className="text-center py-12">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Download em Progresso</h2>
            <p className="text-gray-600 mb-6">Aguarde enquanto baixamos o vídeo do YouTube...</p>
            
            {/* Barra de progresso */}
            <div className="max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${video.download_progress || 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {video.download_progress ? `${video.download_progress.toFixed(1)}%` : 'Iniciando...'}
              </p>
            </div>
          </div>
        )}

        {video.status === 'downloaded' && (
          <div className="space-y-8">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-900 mb-2">Download Concluído!</h2>
              <p className="text-gray-600">Revise o vídeo antes de prosseguir para a transcrição.</p>
            </div>

            {/* Player de vídeo */}
            <div className="bg-black rounded-lg overflow-hidden">
              <video 
                controls 
                className="w-full max-h-[500px]"
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'}/videos/${video.id}/stream`}
              >
                Seu navegador não suporta reprodução de vídeo.
              </video>
            </div>

            {/* Botão de confirmação */}
            <div className="text-center">
              <Button
                onClick={handleConfirmDownload}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white px-8"
              >
                <CheckCircle2 className="w-5 h-5" />
                Prosseguir para Transcrição
              </Button>
              <p className="text-sm text-gray-500 mt-3">
                Confirme que o vídeo foi baixado corretamente para continuar.
              </p>
            </div>
          </div>
        )}

        {video.status === 'download_failed' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-900 mb-3">Erro no Download</h2>
            <p className="text-gray-600 mb-2">Ocorreu um erro ao tentar baixar o vídeo.</p>
            {video.download_error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
                <p className="text-sm text-red-800 font-mono">{video.download_error}</p>
              </div>
            )}
            <Button
              onClick={handleStartDownload}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
