export interface Video {
  id: number;
  youtube_id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  status: VideoStatus;
  channel_id: number | null;
  local_filename: string | null;
  audio_filename: string | null;
  transcript_path: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_error: string | null;
  processing_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export type VideoStatus = 
  | 'pending'
  | 'downloading'
  | 'extracting'
  | 'transcribing'
  | 'analyzing'
  | 'cutting'
  | 'subtitling'
  | 'completed'
  | 'failed';

export interface VideoMetadata {
  title: string;
  description: string;
  thumbnail_url: string;
  duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  channel_name: string;
  published_at: string;
}

export interface ProcessingProgress {
  stage: VideoStatus;
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  eta_seconds?: number;
  data?: {
    downloaded_mb?: number;
    total_mb?: number;
    speed_mbps?: number;
    current_frame?: number;
    total_frames?: number;
    [key: string]: any;
  };
}
