import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videoService } from '@/services/videoService';
import type { Video } from '@/types/video';

export function useVideo(id: number) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => videoService.get(id),
    enabled: !!id,
  });
}

export function useVideos(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: () => videoService.list(params),
  });
}

export function useFetchMetadata() {
  return useMutation({
    mutationFn: (url: string) => videoService.fetchMetadata(url),
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (youtube_id: string) => videoService.create(youtube_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useUpdateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Video> }) =>
      videoService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video', data.id] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => videoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useStartDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => videoService.startDownload(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
  });
}

export function useStartTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => videoService.startTranscription(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
  });
}

export function useStartAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: number; config?: any }) =>
      videoService.startAnalysis(id, config),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['video', id] });
    },
  });
}
