'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sparkles, Loader2, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { videoService } from '@/services/videoService';

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

interface VideoUrlInputProps {
  onMetadataFetched: (metadata: VideoMetadata) => void;
}

export function VideoUrlInput({ onMetadataFetched }: VideoUrlInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Por favor, insira uma URL do YouTube');
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      toast.error('URL inválida. Por favor, insira uma URL válida do YouTube');
      return;
    }

    setLoading(true);
    try {
      const response = await videoService.fetchMetadata(url);
      
      // Verifica se o vídeo já existe no BD
      if (response.exists) {
        toast.info('Vídeo já existe no banco de dados!');
        // Redireciona direto para a página do vídeo
        window.location.href = `/videos/${response.video_id}`;
        return;
      }
      
      // Se não existe, mostra preview dos metadados
      toast.success('✨ Vídeo encontrado! Analisando...');
      onMetadataFetched(response.metadata);
      setUrl('');
    } catch (error) {
      toast.error('Erro ao buscar vídeo. Verifique a URL.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>Sistema de IA para Criação de Highlights</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight">
          Transforme vídeos do YouTube
          <br />
          <span className="text-blue-600">em highlights virais</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Cole a URL de qualquer vídeo do YouTube e nossa IA vai criar shorts prontos para viralizar
        </p>
      </div>

      {/* Input Area */}
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 p-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    autoFocus
                    className="h-14 text-base pl-12 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg"
                  className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
                  disabled={loading || !url.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Criar Highlights
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-slate-500">
            Suporta vídeos públicos do YouTube
          </p>
        </form>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Análise com IA</h3>
            <p className="text-sm text-slate-600">Identifica automaticamente os melhores momentos</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
              <Youtube className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Formato Vertical</h3>
            <p className="text-sm text-slate-600">Otimizado para Shorts, Reels e TikTok</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">100% Automático</h3>
            <p className="text-sm text-slate-600">Do vídeo ao resultado em minutos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
