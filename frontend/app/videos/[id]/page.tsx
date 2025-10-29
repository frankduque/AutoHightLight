'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Download, FileText, Scissors, Sparkles, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Video {
  id: number;
  youtube_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  channel_name: string;
  channel_thumbnail?: string;
  duration_seconds: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  status: string;
  created_at: string;
  download_progress?: number;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  const loadVideo = async (id: number) => {
    try {
      setLoading(true);
      const data = await videoService.get(id);
      setVideo(data);
    } catch (error) {
      toast.error('Erro ao carregar vídeo');
      console.error(error);
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
      setTimeout(() => loadVideo(video.id), 1000);
    } catch (error) {
      toast.error('Erro ao iniciar download');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">Carregando vídeo...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!video) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const steps = [
    { 
      key: 'pending', 
      label: 'Pronto para começar',
      icon: Circle,
      action: 'Iniciar Download',
      actionIcon: Download,
      onClick: handleStartDownload
    },
    { 
      key: 'downloading', 
      label: 'Baixando vídeo',
      icon: Download,
      progress: video.download_progress
    },
    { 
      key: 'downloaded', 
      label: 'Vídeo baixado',
      icon: CheckCircle2,
      action: 'Iniciar Transcrição',
      actionIcon: FileText
    },
    { 
      key: 'transcribing', 
      label: 'Transcrevendo áudio',
      icon: FileText
    },
    { 
      key: 'transcribed', 
      label: 'Transcrição concluída',
      icon: CheckCircle2,
      action: 'Analisar com IA',
      actionIcon: Sparkles
    },
    { 
      key: 'analyzing', 
      label: 'Analisando com IA',
      icon: Sparkles
    },
    { 
      key: 'analyzed', 
      label: 'Análise concluída',
      icon: CheckCircle2,
      action: 'Gerar Highlights',
      actionIcon: Scissors
    },
    { 
      key: 'generating', 
      label: 'Gerando highlights',
      icon: Scissors
    },
    { 
      key: 'completed', 
      label: 'Concluído',
      icon: CheckCircle2
    },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === video.status);
  };

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = steps[currentStepIndex];

  const truncateDescription = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back button */}
        <Link href="/videos">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>

        {/* Layout em grid */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Coluna da esquerda - Vídeo info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Thumbnail */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(video.duration_seconds)}
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
              <h1 className="text-xl font-bold text-gray-900 line-clamp-2">{video.title}</h1>
              
              <div className="flex items-center gap-2">
                {video.channel_thumbnail && (
                  <img
                    src={video.channel_thumbnail}
                    alt={video.channel_name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-600 font-medium">{video.channel_name}</span>
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div>{video.view_count.toLocaleString()} views</div>
                <div>{video.like_count.toLocaleString()} likes</div>
                <div>{video.comment_count.toLocaleString()} comments</div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {showFullDescription ? video.description : truncateDescription(video.description)}
                  </p>
                  {video.description.length > 200 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-blue-600 text-sm font-medium mt-2 flex items-center gap-1 hover:text-blue-700"
                    >
                      {showFullDescription ? (
                        <>Mostrar menos <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>Mostrar mais <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              <Button variant="outline" className="w-full gap-2 mt-3" asChild>
                <a href={`https://www.youtube.com/watch?v=${video.youtube_id}`} target="_blank" rel="noopener noreferrer">
                  <Play className="w-4 h-4" />
                  Assistir no YouTube
                </a>
              </Button>
            </div>
          </div>

          {/* Coluna da direita - Wizard de processamento */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Pipeline de Processamento</h2>
              
              {/* Wizard Steps */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isProcessing = isCurrent && ['downloading', 'transcribing', 'analyzing', 'generating'].includes(video.status);
                  
                  return (
                    <div key={step.key} className="relative">
                      {/* Connector line */}
                      {index < steps.length - 1 && (
                        <div 
                          className={`absolute left-6 top-12 w-0.5 h-8 ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                      
                      {/* Step card */}
                      <div className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                        isCurrent 
                          ? 'border-blue-500 bg-blue-50' 
                          : isCompleted 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}>
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          isCurrent 
                            ? 'bg-blue-500 text-white' 
                            : isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          <Icon className={`w-6 h-6 ${isProcessing ? 'animate-pulse' : ''}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className={`font-semibold ${
                                isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-600'
                              }`}>
                                {step.label}
                              </h3>
                              
                              {/* Progress bar for downloading */}
                              {isCurrent && step.progress !== undefined && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-blue-700 font-medium">
                                      {step.progress.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-2.5">
                                    <div
                                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                      style={{ width: `${step.progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Processing indicator */}
                              {isProcessing && !step.progress && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
                                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                  <span>Em andamento...</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Action button */}
                            {isCurrent && step.action && step.onClick && (
                              <Button 
                                onClick={step.onClick}
                                className="flex-shrink-0 gap-2 bg-blue-600 hover:bg-blue-700"
                              >
                                {step.actionIcon && <step.actionIcon className="w-4 h-4" />}
                                {step.action}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
