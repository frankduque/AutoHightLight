export interface Highlight {
  id: number;
  video_id: number;
  start_time_seconds: number;
  duration_seconds: number;
  end_time_seconds: number;
  description: string;
  transcript_excerpt: string | null;
  ai_score: number;
  impact_score: number;
  emotion_score: number;
  clarity_score: number;
  novelty_score: number;
  engagement_potential: number;
  emotion_type: string | null;
  is_tiktok_ready: boolean;
  hashtags: string[] | null;
  status: HighlightStatus;
  exported_filename: string | null;
  exported_at: string | null;
  published_url: string | null;
  published_platform: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type HighlightStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cutting'
  | 'subtitling'
  | 'ready'
  | 'published';

export interface HighlightAdjustment {
  start_offset: number;
  end_offset: number;
}

export interface SubtitleStyle {
  font_family: string;
  font_size: number;
  color: string;
  background_color: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fade' | 'slide';
}

export interface SubtitleSegment {
  start_time: number;
  end_time: number;
  text: string;
}
