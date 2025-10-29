import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.video import (
    VideoStatus,
    VideoMetadataResponse,
    VideoCreate,
    VideoResponse,
    VideoListResponse
)

class TestVideoSchemas:
    """Testes para schemas de vídeo"""
    
    def test_video_status_enum(self):
        """Deve ter todos os status válidos"""
        assert VideoStatus.pending == "pending"
        assert VideoStatus.downloading == "downloading"
        assert VideoStatus.downloaded == "downloaded"
        assert VideoStatus.transcribing == "transcribing"
        assert VideoStatus.transcribed == "transcribed"
        assert VideoStatus.analyzing == "analyzing"
        assert VideoStatus.analyzed == "analyzed"
        assert VideoStatus.ranked == "ranked"
        assert VideoStatus.generating == "generating"
        assert VideoStatus.completed == "completed"
        assert VideoStatus.failed == "failed"
    
    def test_video_metadata_response_valid(self):
        """Deve criar VideoMetadataResponse com dados válidos"""
        data = {
            "youtube_id": "test123",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "duration_formatted": "5:00",
            "channel_name": "Test Channel",
            "channel_id": "UC123",
            "published_at": datetime.now(),
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10
        }
        
        response = VideoMetadataResponse(**data)
        assert response.youtube_id == "test123"
        assert response.title == "Test Video"
        assert response.duration_seconds == 300
    
    def test_video_metadata_response_optional_fields(self):
        """Deve aceitar campos opcionais como None"""
        data = {
            "youtube_id": "test123",
            "title": "Test Video",
            "description": None,
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "duration_formatted": "5:00",
            "channel_name": "Test Channel",
            "channel_id": "UC123",
            "published_at": datetime.now(),
            "view_count": 1000,
            "like_count": 100
        }
        
        response = VideoMetadataResponse(**data)
        assert response.description is None
        assert response.comment_count == 0
    
    def test_video_metadata_response_missing_required_field(self):
        """Deve rejeitar quando campo obrigatório falta"""
        data = {
            "youtube_id": "test123",
            "title": "Test Video"
        }
        
        with pytest.raises(ValidationError):
            VideoMetadataResponse(**data)
    
    def test_video_create_valid(self):
        """Deve criar VideoCreate com dados válidos"""
        data = {
            "youtube_id": "test456",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": datetime.now()
        }
        
        video = VideoCreate(**data)
        assert video.youtube_id == "test456"
        assert video.title == "Test Video"
    
    def test_video_create_default_values(self):
        """Deve usar valores padrão quando não fornecidos"""
        data = {
            "youtube_id": "test789",
            "title": "Test Video",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "published_at": datetime.now()
        }
        
        video = VideoCreate(**data)
        assert video.description is None
        assert video.comment_count == 0
    
    def test_video_response_valid(self):
        """Deve criar VideoResponse com dados válidos"""
        data = {
            "id": 1,
            "youtube_id": "test123",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "status": VideoStatus.pending,
            "download_progress": 0.0,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        response = VideoResponse(**data)
        assert response.id == 1
        assert response.status == VideoStatus.pending
        assert response.download_progress == 0.0
    
    def test_video_list_response_empty(self):
        """Deve criar VideoListResponse vazia"""
        response = VideoListResponse(videos=[], total=0)
        assert len(response.videos) == 0
        assert response.total == 0
    
    def test_video_list_response_with_videos(self):
        """Deve criar VideoListResponse com vídeos"""
        videos_data = [
            {
                "id": i,
                "youtube_id": f"test{i}",
                "title": f"Test Video {i}",
                "description": None,
                "thumbnail_url": "https://example.com/thumb.jpg",
                "duration_seconds": 300,
                "channel_name": "Test Channel",
                "status": VideoStatus.pending,
                "download_progress": 0.0,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            for i in range(3)
        ]
        
        videos = [VideoResponse(**data) for data in videos_data]
        response = VideoListResponse(videos=videos, total=3)
        
        assert len(response.videos) == 3
        assert response.total == 3
        assert response.videos[0].id == 0
        assert response.videos[2].id == 2
