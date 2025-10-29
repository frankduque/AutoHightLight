import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoService } from '@/services/videoService';
import { api } from '@/services/api';

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('VideoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchMetadata', () => {
    it('deve buscar metadados de um vídeo do YouTube', async () => {
      const mockResponse = {
        youtube_id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        description: 'Test Description',
        thumbnail_url: 'https://example.com/thumb.jpg',
        duration_seconds: 213,
        duration_formatted: '3:33',
        channel_name: 'Test Channel',
        channel_id: 'UC123',
        published_at: '2024-01-01T00:00:00Z',
        view_count: 1000000,
        like_count: 50000,
        comment_count: 10000,
      };

      vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

      const result = await videoService.fetchMetadata('https://youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result).toEqual(mockResponse);
      expect(api.post).toHaveBeenCalledWith('/videos/fetch-metadata', {
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      });
    });

    it('deve lançar erro quando a API falhar', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('API Error'));

      await expect(
        videoService.fetchMetadata('https://youtube.com/watch?v=invalid')
      ).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('deve criar um novo vídeo', async () => {
      const mockVideo = {
        id: 1,
        youtube_id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(api.post).mockResolvedValue({ data: { video: mockVideo } });

      const result = await videoService.create({
        youtube_id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        description: 'Test',
        thumbnail_url: 'https://example.com/thumb.jpg',
        duration_seconds: 213,
        channel_name: 'Test Channel',
        view_count: 1000000,
        like_count: 50000,
        comment_count: 10000,
        published_at: '2024-01-01T00:00:00Z',
      });

      expect(result).toEqual(mockVideo);
    });
  });

  describe('list', () => {
    it('deve listar vídeos', async () => {
      const mockVideos = [
        { id: 1, title: 'Video 1' },
        { id: 2, title: 'Video 2' },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: { videos: mockVideos } });

      const result = await videoService.list();

      expect(result).toEqual(mockVideos);
    });

    it('deve listar vídeos com filtros', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { videos: [] } });

      await videoService.list({ status: 'completed' });

      expect(api.get).toHaveBeenCalledWith('/videos', {
        params: { status: 'completed' },
      });
    });
  });

  describe('get', () => {
    it('deve buscar um vídeo específico', async () => {
      const mockVideo = { id: 1, title: 'Test Video' };

      vi.mocked(api.get).mockResolvedValue({ data: { video: mockVideo } });

      const result = await videoService.get(1);

      expect(result).toEqual(mockVideo);
    });
  });

  describe('startDownload', () => {
    it('deve iniciar o download de um vídeo', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await videoService.startDownload(1);

      expect(api.post).toHaveBeenCalledWith('/videos/1/download');
    });
  });

  describe('startTranscription', () => {
    it('deve iniciar a transcrição de um vídeo', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await videoService.startTranscription(1);

      expect(api.post).toHaveBeenCalledWith('/videos/1/transcribe');
    });
  });

  describe('startAnalysis', () => {
    it('deve iniciar a análise IA de um vídeo', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await videoService.startAnalysis(1);

      expect(api.post).toHaveBeenCalledWith('/videos/1/analyze', undefined);
    });
  });

  describe('update', () => {
    it('deve atualizar um vídeo', async () => {
      const mockVideo = { id: 1, title: 'Updated Video' };

      vi.mocked(api.put).mockResolvedValue({ data: { video: mockVideo } });

      const result = await videoService.update(1, { title: 'Updated Video' });

      expect(result).toEqual(mockVideo);
      expect(api.put).toHaveBeenCalledWith('/videos/1', { title: 'Updated Video' });
    });
  });

  describe('startCutting', () => {
    it('deve iniciar o corte de um vídeo', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await videoService.startCutting(1);

      expect(api.post).toHaveBeenCalledWith('/videos/1/cut');
    });
  });

  describe('delete', () => {
    it('deve deletar um vídeo', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await videoService.delete(1);

      expect(api.delete).toHaveBeenCalledWith('/videos/1');
    });
  });
});
