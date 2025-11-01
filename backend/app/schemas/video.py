from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class VideoStatus(str, Enum):
    # Fase 1: Download
    pending = "pending"
    downloading = "downloading"
    downloaded = "downloaded"
    download_failed = "download_failed"
    
    # Fase 3A: Extração de Áudio
    extracting_audio = "extracting_audio"
    audio_extracted = "audio_extracted"
    audio_extraction_failed = "audio_extraction_failed"
    
    # Fase 3B: Transcrição
    transcribing = "transcribing"
    transcribed = "transcribed"
    transcription_failed = "transcription_failed"
    
    # Fase 3: Análise IA
    analyzing = "analyzing"
    analyzed = "analyzed"
    analysis_failed = "analysis_failed"
    
    # Fase 4: Highlights
    generating_highlights = "generating_highlights"
    highlights_generated = "highlights_generated"
    highlights_failed = "highlights_failed"
    
    # Fase 5: Corte
    cutting = "cutting"
    cut = "cut"
    cutting_failed = "cutting_failed"
    
    # Fase 6: Ranking
    ranking = "ranking"
    ranked = "ranked"
    ranking_failed = "ranking_failed"
    
    # Fase 7: Legendas
    generating_subtitles = "generating_subtitles"
    subtitles_generated = "subtitles_generated"
    subtitles_failed = "subtitles_failed"
    
    # Final
    completed = "completed"
    failed = "failed"  # Deprecated

class VideoMetadataResponse(BaseModel):
    youtube_id: str
    title: str
    description: Optional[str]
    thumbnail_url: str
    duration_seconds: int
    duration_formatted: str
    channel_name: str
    channel_id: str
    channel_thumbnail: Optional[str] = None
    published_at: datetime
    view_count: int
    like_count: int
    comment_count: Optional[int] = 0

class VideoCreate(BaseModel):
    youtube_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: str
    duration_seconds: int
    channel_name: str
    channel_id: str
    channel_thumbnail: Optional[str] = None
    view_count: int
    like_count: int
    comment_count: Optional[int] = 0
    published_at: datetime

class VideoResponse(BaseModel):
    id: int
    youtube_id: str
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: int
    channel_name: Optional[str]
    channel_id: Optional[str]
    channel_thumbnail: Optional[str]
    view_count: Optional[int] = 0
    like_count: Optional[int] = 0
    comment_count: Optional[int] = 0
    status: VideoStatus
    
    # Paths
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    transcript_path: Optional[str] = None
    
    # Download
    download_progress: float = 0
    download_error: Optional[str] = None
    download_reviewed_at: Optional[datetime] = None
    
    # Audio Extraction
    audio_extraction_progress: Optional[float] = 0
    audio_extraction_error: Optional[str] = None
    audio_reviewed_at: Optional[datetime] = None
    
    # Transcription
    transcription_progress: Optional[float] = 0
    transcription_error: Optional[str] = None
    transcription_reviewed_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    downloaded_at: Optional[datetime] = None
    extracted_at: Optional[datetime] = None
    transcribed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class VideoListResponse(BaseModel):
    videos: list[VideoResponse]
    total: int
