from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class VideoStatus(str, Enum):
    pending = "pending"
    downloading = "downloading"
    downloaded = "downloaded"
    transcribing = "transcribing"
    transcribed = "transcribed"
    analyzing = "analyzing"
    analyzed = "analyzed"
    ranked = "ranked"
    generating = "generating"
    completed = "completed"
    failed = "failed"

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
    download_progress: float
    download_error: Optional[str] = None
    download_reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class VideoListResponse(BaseModel):
    videos: list[VideoResponse]
    total: int
