'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { ProgressBreadcrumb } from '@/components/ui/progress-breadcrumb';
import { Play, Loader2, AlertCircle, CheckCircle2, FileText, Music } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: number;
  youtube_id: string;
  title: string;
  status: string;
  duration_seconds: number;
  audio_path?: string;
  transcript_path?: string;
  transcription_progress?: number;
  transcription_error?: string;
  transcription_reviewed_at?: string;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export default function TranscribePage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLVideoElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  // Polling para atualizar progresso durante a transcrição
  useEffect(() => {
    if (!video || video.status !== 'transcribing') return;

    const interval = setInterval(() => {
      loadVideo(Number(params.id));
    }, 1500); // Atualiza a cada 1.5 segundos (mais frequente)

    return () => clearInterval(interval);
  }, [video?.status, params.id]);

  // Atualiza tempo do áudio e encontra segmento ativo
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Encontra o índice do segmento ativo
      const activeIndex = transcript.findIndex(
        seg => time >= seg.start && time <= seg.end
      );
      
      if (activeIndex !== -1 && activeIndex !== activeSegmentIndex) {
        setActiveSegmentIndex(activeIndex);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [transcript, activeSegmentIndex]);

  // Auto-scroll para o segmento ativo
  useEffect(() => {
    if (activeSegmentRef.current && activeSegmentIndex !== -1) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [activeSegmentIndex]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignora se estiver editando
      if (editingIndex !== null) return;
      
      const video = audioRef.current;
      if (!video) return;

      switch(e.key) {
        case 'ArrowLeft':
          // Voltar 5 segundos
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          // Avançar 5 segundos
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
        case ' ':
          // Play/Pause
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'ArrowUp':
          // Aumentar velocidade
          e.preventDefault();
          video.playbackRate = Math.min(2, video.playbackRate + 0.25);
          toast.success(`Velocidade: ${video.playbackRate}x`);
          break;
        case 'ArrowDown':
          // Diminuir velocidade
          e.preventDefault();
          video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
          toast.success(`Velocidade: ${video.playbackRate}x`);
          break;
        case 'j':
          // Voltar 10 segundos
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'l':
          // Avançar 10 segundos
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'k':
          // Play/Pause (alternativa)
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'm':
          // Mute/Unmute
          e.preventDefault();
          video.muted = !video.muted;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [editingIndex]);

  const loadVideo = async (id: number) => {
    try {
      const data = await videoService.get(id);
      setVideo(data);
      
      // Atualiza o progresso se disponível
      if (data.transcription_progress) {
        setProgress(data.transcription_progress);
      }

      if (!data.audio_reviewed_at) {
        toast.error("Complete a extração de áudio primeiro");
        router.push(`/videos/${id}/transcription/audio-extraction`);
        return;
      }

      // Se já foi revisado, redireciona para análise
      if (data.transcription_reviewed_at) {
        toast.info("Transcrição já foi revisada. Avançando...");
        router.push(`/videos/${id}/analysis`);
        return;
      }

      if (data.status === "transcribing") {
        setTranscribing(true);
      } else if (data.status === "transcribed") {
        setTranscribing(false);
        setProgress(100);
        // Carrega a transcrição
        if (data.transcript_path) {
          loadTranscript(id);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar vídeo");
      router.push("/videos");
    } finally {
      setLoading(false);
    }
  };

  const loadTranscript = async (id: number) => {
    try {
      const data = await videoService.getTranscript(id);
      setTranscript(data.segments || []);
    } catch (error) {
      console.error("Erro ao carregar transcrição:", error);
    }
  };

  const handleStartTranscription = async () => {
    if (!video) return;

    setTranscribing(true);
    try {
      await videoService.transcribe(video.id);
      toast.success("Transcrição iniciada!");
      setVideo({...video, status: 'transcribing'});
    } catch (error: any) {
      setTranscribing(false);
      toast.error(error.response?.data?.detail || "Erro ao iniciar transcrição");
    }
  };

  const handleConfirmTranscription = async () => {
    if (!video) return;

    try {
      await videoService.reviewTranscription(video.id);
      toast.success("Transcrição confirmada!");
      await new Promise(resolve => setTimeout(resolve, 500));
      // Redireciona para a próxima fase (análise IA)
      router.push(`/videos/${video.id}/analysis`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Erro ao confirmar transcrição");
    }
  };

  // Verifica se um segmento está ativo no tempo atual
  const isSegmentActive = (segment: TranscriptSegment) => {
    return currentTime >= segment.start && currentTime <= segment.end;
  };

  // Pula para um segmento específico
  const seekToSegment = (start: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      audioRef.current.play();
    }
  };

  // Inicia edição de um segmento
  const startEditing = (index: number, text: string) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  // Salva edição do segmento
  const saveEdit = async (index: number) => {
    const updatedTranscript = [...transcript];
    updatedTranscript[index].text = editingText;
    setTranscript(updatedTranscript);
    setEditingIndex(null);
    
    // Salva no backend
    try {
      await videoService.updateTranscript(video!.id, { segments: updatedTranscript });
      toast.success('Texto salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar. A edição só está local.');
    }
  };

  // Cancela edição
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
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
        currentStep={3}
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
          <FileText className="w-8 h-8" />
          <div>
            <div className="text-sm opacity-90">Fase 3B</div>
            <h1 className="text-3xl font-bold">Transcrição de Áudio</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {video.status === "audio_extracted" && !transcript.length && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Transcrever Áudio</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Vamos usar IA para transcrever o áudio em texto. Este processo pode demorar alguns minutos.
            </p>
            <Button
              onClick={handleStartTranscription}
              disabled={transcribing}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500"
            >
              {transcribing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Iniciar Transcrição
                </>
              )}
            </Button>
          </div>
        )}

        {video.status === "transcribing" && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Transcrevendo Áudio...</h2>
            <div className="max-w-md mx-auto mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{progress.toFixed(1)}% concluído</p>
            </div>
            <p className="text-gray-600">Isso pode levar vários minutos dependendo do tamanho do vídeo</p>
          </div>
        )}

        {video.status === "transcription_failed" && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Erro na Transcrição</h2>
            {video.transcription_error && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <p className="text-sm text-red-800 font-mono">{video.transcription_error}</p>
              </div>
            )}
            <Button onClick={handleStartTranscription} variant="outline">
              <Play className="w-5 h-5 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}

        {video.status === "transcribed" && transcript.length > 0 && (
          <div className="space-y-8">
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Transcrição Concluída!</h2>
              <p className="text-gray-600 mb-4">Revise a transcrição enquanto ouve o áudio</p>
            </div>

            {/* Video/Audio Player */}
            <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Vídeo com Transcrição</h3>
                  <p className="text-sm text-gray-600">{transcript.length} segmentos • {Math.floor(video.duration_seconds / 60)}min</p>
                </div>
              </div>
              
              {/* Video Player */}
              <video 
                ref={audioRef}
                controls 
                className="w-full rounded-lg mb-3"
                preload="metadata"
                src={`http://localhost:8001/api/videos/${video.id}/stream`}
              >
                Seu navegador não suporta o elemento de vídeo.
              </video>

              <p className="text-xs text-gray-500 text-center">
                Clique em qualquer texto para pular para aquele momento
              </p>
              
              {/* Atalhos de teclado */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Atalhos de teclado:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">←</kbd> Voltar 5s</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">→</kbd> Avançar 5s</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">J</kbd> Voltar 10s</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">L</kbd> Avançar 10s</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">↑</kbd> Velocidade +</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">↓</kbd> Velocidade -</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">Espaço</kbd> Play/Pause</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">K</kbd> Play/Pause</div>
                  <div><kbd className="px-2 py-1 bg-white rounded border border-gray-300">M</kbd> Mute</div>
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-h-[500px] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4 sticky top-0 bg-white pb-2">Transcrição Completa</h3>
                <div className="space-y-3">
                  {transcript.map((segment, index) => {
                    const isActive = index === activeSegmentIndex;
                    
                    return (
                      <div
                        key={index}
                        ref={isActive ? activeSegmentRef : null}
                        onClick={() => !editingIndex && seekToSegment(segment.start)}
                        className={`p-4 rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-100 border-2 border-blue-500 shadow-md scale-[1.02]'
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        } ${editingIndex === index ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-xs font-mono px-2 py-1 rounded shrink-0 ${
                            isActive 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {new Date(segment.start * 1000).toISOString().substr(11, 8)}
                          </span>
                          
                          {editingIndex === index ? (
                            <div className="flex-1 space-y-2">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEdit(index);
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEdit();
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-start gap-2">
                              <p className={`flex-1 ${
                                isActive 
                                  ? 'text-gray-900 font-semibold' 
                                  : 'text-gray-700'
                              }`}>
                                {segment.text}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(index, segment.text);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleConfirmTranscription}
                size="lg"
                className="gap-2 bg-gradient-to-r from-green-600 to-green-500"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar Transcrição
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
