from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum, Float, Boolean
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class VideoStatus(enum.Enum):
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

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # YouTube metadata
    youtube_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    duration_seconds = Column(Integer, nullable=False)
    channel_name = Column(String(200))
    channel_id = Column(String(100))
    channel_thumbnail = Column(String(500))
    published_at = Column(DateTime)
    view_count = Column(Integer)
    like_count = Column(Integer)
    comment_count = Column(Integer)
    
    # Processing status
    status = Column(SQLEnum(VideoStatus), default=VideoStatus.pending, nullable=False, index=True)
    
    # File paths
    video_path = Column(String(500))  # Path do vídeo baixado
    audio_path = Column(String(500))  # Path do áudio extraído
    transcript_path = Column(String(500))  # Path da transcrição
    
    # Download info
    download_progress = Column(Float, default=0.0)  # 0-100
    download_error = Column(Text)
    
    # Processing timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    downloaded_at = Column(DateTime)
    transcribed_at = Column(DateTime)
    analyzed_at = Column(DateTime)
    
    # Auditoria - Review de cada etapa pelo usuário
    download_reviewed_at = Column(DateTime)  # Usuário confirmou que download está OK
    transcription_reviewed_at = Column(DateTime)  # Usuário revisou e aprovou transcrição
    highlights_reviewed_at = Column(DateTime)  # Usuário revisou e aprovou highlights
    cutting_reviewed_at = Column(DateTime)  # Usuário revisou clipes cortados
    ranking_reviewed_at = Column(DateTime)  # Usuário confirmou ranking
    subtitles_reviewed_at = Column(DateTime)  # Usuário revisou legendas
    
    # Soft delete
    deleted_at = Column(DateTime)
    
    def __repr__(self):
        return f"<Video(id={self.id}, youtube_id={self.youtube_id}, title={self.title[:50]})>"
