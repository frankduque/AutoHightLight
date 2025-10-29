import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { highlightService } from '@/services/highlightService';
import type { Highlight, HighlightAdjustment, SubtitleStyle } from '@/types/highlight';

export function useHighlight(id: number) {
  return useQuery({
    queryKey: ['highlight', id],
    queryFn: () => highlightService.get(id),
    enabled: !!id,
  });
}

export function useHighlights(params?: { 
  video_id?: number; 
  status?: string; 
  limit?: number 
}) {
  return useQuery({
    queryKey: ['highlights', params],
    queryFn: () => highlightService.list(params),
  });
}

export function useUpdateHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Highlight> }) =>
      highlightService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', data.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useAdjustHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adjustment }: { id: number; adjustment: HighlightAdjustment }) =>
      highlightService.adjust(id, adjustment),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', data.id] });
    },
  });
}

export function useRecutHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => highlightService.recut(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', id] });
    },
  });
}

export function useApplySubtitles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, style }: { id: number; style?: SubtitleStyle }) =>
      highlightService.applySubtitles(id, style),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', id] });
    },
  });
}

export function usePublishHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, platforms, caption }: { 
      id: number; 
      platforms: string[]; 
      caption?: string 
    }) => highlightService.publish(id, platforms, caption),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', id] });
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useApproveHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => highlightService.approve(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', data.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useRejectHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => highlightService.reject(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['highlight', data.id] });
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}

export function useDeleteHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => highlightService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights'] });
    },
  });
}
