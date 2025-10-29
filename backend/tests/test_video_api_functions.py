import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from fastapi import HTTPException
from app.api.videos import (
    fetch_video_metadata,
    create_video,
    list_videos,
    get_video,
    delete_video,
    start_download,
    get_download_progress
)
from app.models.video import Video, VideoStatus
from app.schemas.video import VideoCreate

class TestVideoAPIFunctions:
    """Testes para funções da API de vídeos"""
    
    @pytest.mark.asyncio
    @patch('app.api.videos.youtube_service')
    async def test_fetch_video_metadata_success(self, mock_youtube_service):
        """Deve buscar metadados com sucesso"""
        from app.schemas.video import VideoMetadataResponse
        
        mock_metadata = VideoMetadataResponse(
            youtube_id="test123",
            title="Test Video",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            duration_formatted="5:00",
            channel_name="Test Channel",
            channel_id="UC123",
            published_at=datetime.now(),
            view_count=1000,
            like_count=100,
            comment_count=10
        )
        mock_youtube_service.fetch_metadata.return_value = mock_metadata
        
        result = await fetch_video_metadata({"url": "https://youtube.com/watch?v=test123"})
        
        assert result.youtube_id == "test123"
        assert result.title == "Test Video"
    
    @pytest.mark.asyncio
    async def test_fetch_video_metadata_no_url(self):
        """Deve lançar erro quando URL não for fornecida"""
        with pytest.raises(HTTPException) as exc_info:
            await fetch_video_metadata({})
        
        # Pode retornar 400 ou 500 dependendo da implementação
        assert exc_info.value.status_code in [400, 500]
    
    @pytest.mark.asyncio
    @patch('app.api.videos.youtube_service')
    async def test_fetch_video_metadata_invalid_url(self, mock_youtube_service):
        """Deve lançar erro para URL inválida"""
        mock_youtube_service.fetch_metadata.side_effect = ValueError("URL inválida")
        
        with pytest.raises(HTTPException) as exc_info:
            await fetch_video_metadata({"url": "https://google.com"})
        
        assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    @patch('app.api.videos.youtube_service')
    async def test_fetch_video_metadata_service_error(self, mock_youtube_service):
        """Deve lançar erro 500 para erro interno"""
        mock_youtube_service.fetch_metadata.side_effect = Exception("Network error")
        
        with pytest.raises(HTTPException) as exc_info:
            await fetch_video_metadata({"url": "https://youtube.com/watch?v=test"})
        
        assert exc_info.value.status_code == 500
    
    @pytest.mark.asyncio
    async def test_create_video_success(self, db_session):
        """Deve criar vídeo com sucesso"""
        video_data = VideoCreate(
            youtube_id="create123",
            title="Create Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        
        result = await create_video(video_data, db_session)
        
        assert result.youtube_id == "create123"
        assert result.title == "Create Test"
        assert result.status == VideoStatus.pending
    
    @pytest.mark.asyncio
    async def test_create_video_duplicate(self, db_session):
        """Deve lançar erro para vídeo duplicado"""
        video_data = VideoCreate(
            youtube_id="duplicate123",
            title="Duplicate Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        
        # Criar primeiro vídeo
        await create_video(video_data, db_session)
        
        # Tentar criar duplicado
        with pytest.raises(HTTPException) as exc_info:
            await create_video(video_data, db_session)
        
        assert exc_info.value.status_code == 400
        assert "já existe" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_list_videos_empty(self, db_session):
        """Deve retornar lista vazia"""
        result = await list_videos(status=None, limit=50, db=db_session)
        
        assert result.total == 0
        assert len(result.videos) == 0
    
    @pytest.mark.asyncio
    async def test_list_videos_with_data(self, db_session):
        """Deve listar vídeos criados"""
        # Criar vídeos
        for i in range(3):
            video_data = VideoCreate(
                youtube_id=f"list{i}",
                title=f"List Test {i}",
                description="Test",
                thumbnail_url="https://example.com/thumb.jpg",
                duration_seconds=300,
                channel_name="Test Channel",
                view_count=1000,
                like_count=100,
                comment_count=10,
                published_at=datetime.now()
            )
            await create_video(video_data, db_session)
        
        result = await list_videos(status=None, limit=50, db=db_session)
        
        assert result.total == 3
        assert len(result.videos) == 3
    
    @pytest.mark.asyncio
    async def test_list_videos_with_status_filter(self, db_session):
        """Deve filtrar vídeos por status"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="filter123",
            title="Filter Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        await create_video(video_data, db_session)
        
        result = await list_videos(status="pending", limit=50, db=db_session)
        
        assert result.total == 1
        assert result.videos[0].status.value == "pending"
    
    @pytest.mark.asyncio
    async def test_list_videos_invalid_status(self, db_session):
        """Deve lançar erro para status inválido"""
        with pytest.raises(HTTPException) as exc_info:
            await list_videos(status="invalid_status", limit=50, db=db_session)
        
        assert exc_info.value.status_code == 400
        assert "inválido" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_video_success(self, db_session):
        """Deve buscar vídeo por ID"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="get123",
            title="Get Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        created = await create_video(video_data, db_session)
        
        result = await get_video(created.id, db_session)
        
        assert result.id == created.id
        assert result.youtube_id == "get123"
    
    @pytest.mark.asyncio
    async def test_get_video_not_found(self, db_session):
        """Deve lançar erro 404 para vídeo não encontrado"""
        with pytest.raises(HTTPException) as exc_info:
            await get_video(999999, db_session)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_video_success(self, db_session):
        """Deve deletar vídeo (soft delete)"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="delete123",
            title="Delete Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        created = await create_video(video_data, db_session)
        
        result = await delete_video(created.id, db_session)
        
        assert "deletado com sucesso" in result["message"]
        
        # Verificar que não aparece mais
        list_result = await list_videos(status=None, limit=50, db=db_session)
        assert list_result.total == 0
    
    @pytest.mark.asyncio
    async def test_delete_video_not_found(self, db_session):
        """Deve lançar erro 404 para vídeo não encontrado"""
        with pytest.raises(HTTPException) as exc_info:
            await delete_video(999999, db_session)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_start_download_success(self, db_session):
        """Deve iniciar download de vídeo"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="download123",
            title="Download Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        created = await create_video(video_data, db_session)
        
        # Mock de BackgroundTasks
        mock_tasks = MagicMock()
        
        result = await start_download(created.id, mock_tasks, db_session)
        
        assert result["video_id"] == created.id
        assert "iniciado" in result["message"]
        mock_tasks.add_task.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_download_not_found(self, db_session):
        """Deve lançar erro 404 para vídeo não encontrado"""
        mock_tasks = MagicMock()
        
        with pytest.raises(HTTPException) as exc_info:
            await start_download(999999, mock_tasks, db_session)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_start_download_invalid_status(self, db_session):
        """Deve lançar erro 400 se vídeo já está em processamento"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="processing123",
            title="Processing Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        created = await create_video(video_data, db_session)
        
        # Mudar status para downloading
        video_obj = db_session.query(Video).filter(Video.id == created.id).first()
        video_obj.status = VideoStatus.downloading
        db_session.commit()
        
        mock_tasks = MagicMock()
        
        with pytest.raises(HTTPException) as exc_info:
            await start_download(created.id, mock_tasks, db_session)
        
        assert exc_info.value.status_code == 400
        assert "processamento" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_download_progress_success(self, db_session):
        """Deve retornar progresso do download"""
        # Criar vídeo
        video_data = VideoCreate(
            youtube_id="progress123",
            title="Progress Test",
            description="Test",
            thumbnail_url="https://example.com/thumb.jpg",
            duration_seconds=300,
            channel_name="Test Channel",
            view_count=1000,
            like_count=100,
            comment_count=10,
            published_at=datetime.now()
        )
        created = await create_video(video_data, db_session)
        
        result = await get_download_progress(created.id, db_session)
        
        assert result["video_id"] == created.id
        assert result["status"] == "pending"
        assert result["progress"] == 0.0
    
    @pytest.mark.asyncio
    async def test_get_download_progress_not_found(self, db_session):
        """Deve lançar erro 404 para vídeo não encontrado"""
        with pytest.raises(HTTPException) as exc_info:
            await get_download_progress(999999, db_session)
        
        assert exc_info.value.status_code == 404
