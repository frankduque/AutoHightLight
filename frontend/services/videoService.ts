import { api } from './api';
import type { Video, VideoMetadata } from '@/types/video';

export const videoService = {
  // Buscar metadata do YouTube
  async fetchMetadata(url: string): Promise<any> {
    console.log('🔍 fetchMetadata chamado com URL:', url);
    console.log('🌐 Fazendo POST para:', api.defaults.baseURL + '/videos/fetch-metadata');
    const { data } = await api.post('/videos/fetch-metadata', { url });
    console.log('📦 Resposta recebida:', data);
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

  // Progresso do download
  async getDownloadProgress(id: number): Promise<{ video_id: number; status: string; progress: number; error: string | null }> {
    const { data } = await api.get(`/videos/${id}/download-progress`);
    return data;
  },

  // Revisar download
  async reviewDownload(id: number): Promise<Video> {
    const { data } = await api.post(`/videos/${id}/review-download`);
    return data;
  },

  // Reprocessar metadados
  async refreshMetadata(id: number): Promise<Video> {
    const { data } = await api.post(`/videos/${id}/refresh-metadata`);
    return data;
  },

  // Extração de áudio (Fase 3A)
  async extractAudio(id: number): Promise<void> {
    await api.post(`/videos/${id}/extract-audio`);
  },

  async getAudioProgress(id: number): Promise<{ video_id: number; status: string; progress: number; error: string | null }> {
    const { data } = await api.get(`/videos/${id}/audio-progress`);
    return data;
  },

  async reviewAudio(id: number): Promise<Video> {
    const { data } = await api.post(`/videos/${id}/review-audio`);
    return data;
  },

  // Transcrição
  async transcribe(id: number): Promise<void> {
    await api.post(`/videos/${id}/transcribe`);
  },

  async getTranscriptionProgress(id: number): Promise<{ video_id: number; status: string; progress: number; error: string | null }> {
    const { data } = await api.get(`/videos/${id}/transcription-progress`);
    return data;
  },

  async getTranscript(id: number): Promise<{ segments: Array<{ start: number; end: number; text: string }> }> {
    const { data } = await api.get(`/videos/${id}/transcript`);
    return data;
  },

  async updateTranscript(id: number, transcript: { segments: Array<{ start: number; end: number; text: string }> }): Promise<void> {
    await api.put(`/videos/${id}/transcript`, transcript);
  },

  async reviewTranscription(id: number): Promise<Video> {
    const { data } = await api.post(`/videos/${id}/review-transcription`);
    return data;
  },

  // URL para streaming do vídeo
  getStreamUrl(id: number): string {
    return `${api.defaults.baseURL}/videos/${id}/stream`;
  },

  // Iniciar transcrição (deprecated - use transcribe)
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
