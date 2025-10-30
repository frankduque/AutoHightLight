'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { videoService } from '@/services/videoService';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TranscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadVideo(Number(params.id));
    }
  }, [params.id]);

  const loadVideo = async (id: number) => {
    try {
      const data = await videoService.get(id);
      setVideo(data);

      // Verifica se download foi revisado
      if (!data.download_reviewed_at) {
        toast.error('Complete o download primeiro');
        router.push(`/videos/${id}/download`);
      }
    } catch (error) {
      toast.error('Erro ao carregar');
      router.push('/videos');
    } finally {
      setLoading(false);
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
          { num: 1, label: 'Download', active: false, completed: true },
          { num: 2, label: 'Transcrição', active: true, completed: false },
          { num: 3, label: 'Análise IA', active: false, completed: false },
          { num: 4, label: 'Highlights', active: false, completed: false },
          { num: 5, label: 'Corte', active: false, completed: false },
          { num: 6, label: 'Ranking', active: false, completed: false },
          { num: 7, label: 'Legendas', active: false, completed: false }
        ].map((step, index) => (
          <div key={step.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              step.active 
                ? 'bg-blue-100 border-2 border-blue-500' 
                : step.completed
                ? 'bg-green-100 border-2 border-green-500'
                : 'bg-gray-100 border-2 border-gray-300 opacity-50'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.active 
                  ? 'bg-blue-500 text-white' 
                  : step.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-400 text-white'
              }`}>
                {step.completed ? '✓' : step.num}
              </div>
              <span className={`text-sm font-medium ${
                step.active 
                  ? 'text-blue-900' 
                  : step.completed
                  ? 'text-green-900'
                  : 'text-gray-600'
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
          <FileText className="w-8 h-8" />
          <div>
            <div className="text-sm opacity-90">Etapa 2 de 7</div>
            <h1 className="text-3xl font-bold">Transcrição</h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-purple-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Etapa de Transcrição</h2>
          <p className="text-gray-600 mb-8">Esta funcionalidade será implementada em breve.</p>
          <Button
            onClick={() => router.push('/videos')}
            size="lg"
          >
            Voltar para Lista
          </Button>
        </div>
      </div>
    </div>
  );
}
