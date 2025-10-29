import { api } from './api';
import type { Video, VideoMetadata } from '@/types/video';

export const videoService = {
  // Buscar metadata do YouTube
  async fetchMetadata(url: string): Promise<any> {
    const { data } = await api.post('/videos/fetch-metadata', { url });
    return data;
  },

  // Criar vídeo
  async create(videoData: {
    youtube_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    duration_seconds: number;
    channel_name: string;
    channel_id: string;
    channel_thumbnail: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string;
  }): Promise<Video> {
    const { data } = await api.post('/videos', videoData);
    return data.video || data;
  },

  // Listar vídeos
  async list(params?: { status?: string; limit?: number }): Promise<{ videos: Video[]; total: number }> {
    const { data } = await api.get('/videos', { params });
    return data;
  },

  // Detalhes de um vídeo
  async get(id: number): Promise<Video> {
    const { data } = await api.get(`/videos/${id}`);
    return data.video || data;
  },

  // Atualizar vídeo
  async update(id: number, updates: Partial<Video>): Promise<Video> {
    const { data } = await api.put(`/videos/${id}`, updates);
    return data.video || data;
  },

  // Iniciar download
  async startDownload(id: number): Promise<void> {
    await api.post(`/videos/${id}/download`);
  },

  // Iniciar transcrição
  async startTranscription(id: number): Promise<void> {
    await api.post(`/videos/${id}/transcribe`);
  },

  // Iniciar análise IA
  async startAnalysis(id: number, config?: any): Promise<void> {
    await api.post(`/videos/${id}/analyze`, config);
  },

  // Iniciar corte de vídeo
  async startCutting(id: number): Promise<void> {
    await api.post(`/videos/${id}/cut`);
  },

  // Deletar vídeo
  async delete(id: number): Promise<void> {
    await api.delete(`/videos/${id}`);
  },
};
