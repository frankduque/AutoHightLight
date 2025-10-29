import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from app.models.video import Video, VideoStatus
from app.services.download import download_video_task

class TestDownloadService:
    """Testes para o serviço de download"""
    
    def test_download_service_imports(self):
        """Deve importar corretamente o serviço de download"""
        from app.services import download
        assert hasattr(download, 'download_video_task')
    
    def test_download_task_function_exists(self):
        """Deve ter a função de download"""
        from app.services.download import download_video_task
        assert callable(download_video_task)
    
    @patch('app.services.download.youtube_service')
    @patch('app.services.download.SessionLocal')
    @patch('app.services.download.os.makedirs')
    def test_download_video_task_success(self, mock_makedirs, mock_session, mock_youtube_service):
        """Deve fazer download de vídeo com sucesso"""
        # Mock da sessão do banco
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Mock do vídeo
        mock_video = Mock(spec=Video)
        mock_video.id = 1
        mock_video.youtube_id = "test123"
        mock_video.title = "Test Video"
        mock_video.status = VideoStatus.downloading
        mock_video.download_progress = 0.0
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_video
        
        # Mock do download
        mock_youtube_service.download_video.return_value = "/path/test123.mp4"
        
        # Executar
        download_video_task(1)
        
        # Verificar
        assert mock_video.status == VideoStatus.downloaded
        assert mock_video.download_progress == 100.0
        assert mock_video.video_path == "/path/test123.mp4"
        assert mock_video.downloaded_at is not None
        mock_db.commit.assert_called()
    
    @patch('app.services.download.youtube_service')
    @patch('app.services.download.SessionLocal')
    def test_download_video_task_video_not_found(self, mock_session, mock_youtube_service):
        """Deve lidar com vídeo não encontrado"""
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Vídeo não existe
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Executar (não deve lançar erro)
        download_video_task(999)
        
        # Não deve ter tentado fazer download
        mock_youtube_service.download_video.assert_not_called()
    
    @patch('app.services.download.youtube_service')
    @patch('app.services.download.SessionLocal')
    @patch('app.services.download.os.makedirs')
    def test_download_video_task_error(self, mock_makedirs, mock_session, mock_youtube_service):
        """Deve tratar erro no download"""
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        mock_video = Mock(spec=Video)
        mock_video.id = 1
        mock_video.youtube_id = "test456"
        mock_video.title = "Test Video"
        
        # Retornar o vídeo em duas chamadas (antes e depois do erro)
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_video,  # Primeira chamada
            mock_video   # Segunda chamada (após erro)
        ]
        
        # Simular erro no download
        mock_youtube_service.download_video.side_effect = Exception("Network error")
        
        # Executar
        download_video_task(1)
        
        # Verificar que status foi atualizado para failed
        assert mock_video.status == VideoStatus.failed
        assert mock_video.download_error == "Network error"
        mock_db.commit.assert_called()
    
    @patch('app.services.download.youtube_service')
    @patch('app.services.download.SessionLocal')
    @patch('app.services.download.os.makedirs')
    def test_download_video_task_progress_callback(self, mock_makedirs, mock_session, mock_youtube_service):
        """Deve atualizar progresso durante o download"""
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        mock_video = Mock(spec=Video)
        mock_video.id = 1
        mock_video.youtube_id = "test789"
        mock_video.title = "Test Video"
        mock_video.download_progress = 0.0
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_video
        
        # Capturar o callback de progresso
        captured_callback = None
        
        def capture_callback(youtube_id, output_path, progress_callback=None):
            nonlocal captured_callback
            captured_callback = progress_callback
            if progress_callback:
                progress_callback(50.0)  # Simular 50% de progresso
            return "/path/test789.mp4"
        
        mock_youtube_service.download_video.side_effect = capture_callback
        
        # Executar
        download_video_task(1)
        
        # Verificar que callback foi usado
        assert captured_callback is not None
        # O progresso foi atualizado durante o download
        assert mock_db.commit.called
    
    @patch('app.services.download.SessionLocal')
    def test_download_video_task_closes_session(self, mock_session):
        """Deve fechar sessão do banco mesmo com erro"""
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        
        # Fazer query retornar None (vídeo não encontrado)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Executar
        download_video_task(1)
        
        # Verificar que sessão foi fechada
        mock_db.close.assert_called_once()
