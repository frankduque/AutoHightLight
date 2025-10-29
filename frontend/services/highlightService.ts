import { api } from './api';
import type { Highlight, HighlightAdjustment, SubtitleStyle } from '@/types/highlight';

export const highlightService = {
  // Listar highlights
  async list(params?: { 
    video_id?: number; 
    status?: string; 
    limit?: number 
  }): Promise<Highlight[]> {
    const { data } = await api.get('/highlights', { params });
    return data.highlights || data;
  },

  // Detalhes de um highlight
  async get(id: number): Promise<Highlight> {
    const { data } = await api.get(`/highlights/${id}`);
    return data.highlight || data;
  },

  // Atualizar highlight
  async update(id: number, updates: Partial<Highlight>): Promise<Highlight> {
    const { data } = await api.put(`/highlights/${id}`, updates);
    return data.highlight || data;
  },

  // Ajustar tempos do highlight
  async adjust(id: number, adjustment: HighlightAdjustment): Promise<Highlight> {
    const { data } = await api.post(`/highlights/${id}/adjust`, adjustment);
    return data.highlight || data;
  },

  // Recortar com novos parâmetros
  async recut(id: number): Promise<void> {
    await api.post(`/highlights/${id}/recut`);
  },

  // Aplicar legendas
  async applySubtitles(id: number, style?: SubtitleStyle): Promise<void> {
    await api.post(`/highlights/${id}/subtitle`, { style });
  },

  // Publicar em plataformas
  async publish(id: number, platforms: string[], caption?: string): Promise<void> {
    await api.post(`/highlights/${id}/publish`, { platforms, caption });
  },

  // Aprovar highlight
  async approve(id: number): Promise<Highlight> {
    const { data } = await api.post(`/highlights/${id}/approve`);
    return data.highlight || data;
  },

  // Rejeitar highlight
  async reject(id: number): Promise<Highlight> {
    const { data } = await api.post(`/highlights/${id}/reject`);
    return data.highlight || data;
  },

  // Deletar highlight
  async delete(id: number): Promise<void> {
    await api.delete(`/highlights/${id}`);
  },

  // Download do vídeo cortado
  getDownloadUrl(id: number): string {
    return `${api.defaults.baseURL}/highlights/${id}/download`;
  },
};
