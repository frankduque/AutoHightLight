import pytest
from datetime import datetime
from app.models.video import Video, VideoStatus

class TestVideoModel:
    """Testes para o modelo Video"""
    
    def test_create_video(self, db_session):
        """Deve criar um vídeo com valores padrão"""
        video = Video(
            youtube_id="test123",
            title="Test Video",
            description="Test Description",
            duration_seconds=300,
            channel_name="Test Channel"
        )
        
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)
        
        assert video.id is not None
        assert video.youtube_id == "test123"
        assert video.title == "Test Video"
        assert video.status == VideoStatus.pending
        assert video.download_progress == 0.0
        assert video.deleted_at is None
        assert video.created_at is not None
    
    def test_video_status_enum(self):
        """Deve validar valores do enum VideoStatus"""
        assert VideoStatus.pending.value == "pending"
        assert VideoStatus.downloading.value == "downloading"
        assert VideoStatus.downloaded.value == "downloaded"
        assert VideoStatus.transcribing.value == "transcribing"
        assert VideoStatus.transcribed.value == "transcribed"
        assert VideoStatus.analyzing.value == "analyzing"
        assert VideoStatus.analyzed.value == "analyzed"
        assert VideoStatus.ranked.value == "ranked"
        assert VideoStatus.generating.value == "generating"
        assert VideoStatus.completed.value == "completed"
        assert VideoStatus.failed.value == "failed"
    
    def test_video_unique_youtube_id(self, db_session):
        """Deve garantir youtube_id único"""
        video1 = Video(
            youtube_id="unique123",
            title="Video 1",
            description="Description 1",
            duration_seconds=100,
            channel_name="Channel 1"
        )
        
        video2 = Video(
            youtube_id="unique123",
            title="Video 2",
            description="Description 2",
            duration_seconds=200,
            channel_name="Channel 2"
        )
        
        db_session.add(video1)
        db_session.commit()
        
        db_session.add(video2)
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()
    
    def test_soft_delete(self, db_session):
        """Deve fazer soft delete de vídeo"""
        video = Video(
            youtube_id="test456",
            title="Test Video",
            description="Test Description",
            duration_seconds=300,
            channel_name="Test Channel"
        )
        
        db_session.add(video)
        db_session.commit()
        
        # Soft delete
        video.deleted_at = datetime.now()
        db_session.commit()
        
        # Verificar que ainda existe no banco
        all_videos = db_session.query(Video).all()
        assert len(all_videos) == 1
        
        # Mas não aparece em queries normais
        active_videos = db_session.query(Video).filter(Video.deleted_at.is_(None)).all()
        assert len(active_videos) == 0
    
    def test_update_video_status(self, db_session):
        """Deve atualizar status do vídeo"""
        video = Video(
            youtube_id="test789",
            title="Test Video",
            description="Test Description",
            duration_seconds=300,
            channel_name="Test Channel"
        )
        
        db_session.add(video)
        db_session.commit()
        
        assert video.status == VideoStatus.pending
        
        video.status = VideoStatus.downloading
        db_session.commit()
        
        assert video.status == VideoStatus.downloading
    
    def test_update_download_progress(self, db_session):
        """Deve atualizar progresso do download"""
        video = Video(
            youtube_id="test101",
            title="Test Video",
            description="Test Description",
            duration_seconds=300,
            channel_name="Test Channel"
        )
        
        db_session.add(video)
        db_session.commit()
        
        assert video.download_progress == 0.0
        
        video.download_progress = 50.5
        db_session.commit()
        
        assert video.download_progress == 50.5
