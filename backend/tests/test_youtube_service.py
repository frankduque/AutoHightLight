import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from app.services.youtube import YouTubeService, youtube_service

class TestYouTubeService:
    """Testes para o serviço do YouTube"""
    
    def test_extract_video_id_from_watch_url(self):
        """Deve extrair ID de URL padrão do YouTube"""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_extract_video_id_from_short_url(self):
        """Deve extrair ID de URL curta do YouTube"""
        url = "https://youtu.be/dQw4w9WgXcQ"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_extract_video_id_from_embed_url(self):
        """Deve extrair ID de URL embed do YouTube"""
        url = "https://www.youtube.com/embed/dQw4w9WgXcQ"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_extract_video_id_from_v_url(self):
        """Deve extrair ID de URL com /v/"""
        url = "https://www.youtube.com/v/dQw4w9WgXcQ"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_extract_video_id_with_parameters(self):
        """Deve extrair ID de URL com parâmetros"""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"
    
    def test_extract_video_id_invalid_url(self):
        """Deve retornar None para URL inválida"""
        url = "https://www.google.com"
        video_id = YouTubeService.extract_video_id(url)
        assert video_id is None
    
    def test_extract_video_id_empty_url(self):
        """Deve retornar None para URL vazia"""
        url = ""
        video_id = YouTubeService.extract_video_id(url)
        assert video_id is None
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_fetch_metadata_success(self, mock_yt_dlp):
        """Deve buscar metadados com sucesso"""
        # Mock do yt_dlp
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        
        mock_info = {
            'title': 'Test Video',
            'description': 'Test Description',
            'thumbnail': 'https://example.com/thumb.jpg',
            'duration': 300,
            'uploader': 'Test Channel',
            'channel_id': 'UC123',
            'upload_date': '20240101',
            'view_count': 1000,
            'like_count': 100,
            'comment_count': 10
        }
        mock_ydl_instance.extract_info.return_value = mock_info
        
        # Testar
        url = "https://www.youtube.com/watch?v=test123"
        metadata = YouTubeService.fetch_metadata(url)
        
        assert metadata.youtube_id == "test123"
        assert metadata.title == "Test Video"
        assert metadata.duration_seconds == 300
        assert metadata.duration_formatted == "5:00"
        assert metadata.view_count == 1000
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_fetch_metadata_with_hours(self, mock_yt_dlp):
        """Deve formatar duração com horas corretamente"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        
        mock_info = {
            'title': 'Long Video',
            'description': 'Test',
            'thumbnail': 'https://example.com/thumb.jpg',
            'duration': 3665,  # 1:01:05
            'uploader': 'Test',
            'channel_id': 'UC123',
            'upload_date': '20240101',
            'view_count': 100,
            'like_count': 10,
            'comment_count': 1
        }
        mock_ydl_instance.extract_info.return_value = mock_info
        
        url = "https://www.youtube.com/watch?v=test456"
        metadata = YouTubeService.fetch_metadata(url)
        
        assert metadata.duration_formatted == "1:01:05"
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_fetch_metadata_optional_fields(self, mock_yt_dlp):
        """Deve lidar com campos opcionais ausentes"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        
        mock_info = {
            'title': 'Test Video',
            'thumbnail': 'https://example.com/thumb.jpg',
            'duration': 100,
            'uploader': 'Test'
        }
        mock_ydl_instance.extract_info.return_value = mock_info
        
        url = "https://www.youtube.com/watch?v=test789"
        metadata = YouTubeService.fetch_metadata(url)
        
        assert metadata.description == ""
        assert metadata.view_count == 0
        assert metadata.like_count == 0
        assert metadata.comment_count == 0
    
    def test_fetch_metadata_invalid_url(self):
        """Deve lançar erro para URL inválida"""
        url = "https://www.google.com"
        
        with pytest.raises(ValueError, match="URL inválida"):
            YouTubeService.fetch_metadata(url)
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_fetch_metadata_yt_dlp_error(self, mock_yt_dlp):
        """Deve lançar erro quando yt_dlp falhar"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        mock_ydl_instance.extract_info.side_effect = Exception("Network error")
        
        url = "https://www.youtube.com/watch?v=test123"
        
        with pytest.raises(Exception, match="Erro ao buscar metadados"):
            YouTubeService.fetch_metadata(url)
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_download_video_success(self, mock_yt_dlp):
        """Deve fazer download de vídeo com sucesso"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        
        mock_info = {'id': 'test123', 'ext': 'mp4'}
        mock_ydl_instance.extract_info.return_value = mock_info
        mock_ydl_instance.prepare_filename.return_value = "/path/test123.mp4"
        
        filepath = YouTubeService.download_video("test123", "/output")
        
        assert filepath == "/path/test123.mp4"
        mock_ydl_instance.extract_info.assert_called_once()
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_download_video_with_progress_callback(self, mock_yt_dlp):
        """Deve chamar callback de progresso durante download"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        
        mock_info = {'id': 'test456', 'ext': 'mp4'}
        mock_ydl_instance.extract_info.return_value = mock_info
        mock_ydl_instance.prepare_filename.return_value = "/path/test456.mp4"
        
        progress_called = []
        
        def progress_callback(progress):
            progress_called.append(progress)
        
        # Capturar progress_hooks para testar
        captured_opts = None
        
        def capture_init(opts):
            nonlocal captured_opts
            captured_opts = opts
            return MagicMock(__enter__=MagicMock(return_value=mock_ydl_instance), __exit__=MagicMock())
        
        mock_yt_dlp.side_effect = capture_init
        
        filepath = YouTubeService.download_video("test456", "/output", progress_callback)
        
        # Verificar que progress_hooks foi configurado
        assert captured_opts is not None
        assert 'progress_hooks' in captured_opts
        assert len(captured_opts['progress_hooks']) == 1
        
        # Simular chamadas do hook
        progress_hook = captured_opts['progress_hooks'][0]
        
        # Testar com status downloading
        progress_hook({
            'status': 'downloading',
            'downloaded_bytes': 5000,
            'total_bytes': 10000
        })
        assert len(progress_called) == 1
        assert progress_called[0] == 50.0
        
        # Testar com total_bytes_estimate
        progress_hook({
            'status': 'downloading',
            'downloaded_bytes': 7500,
            'total_bytes_estimate': 10000
        })
        assert len(progress_called) == 2
        assert progress_called[1] == 75.0
        
        # Testar com status diferente (não deve chamar callback)
        progress_hook({'status': 'finished'})
        assert len(progress_called) == 2
        
        # Testar sem total (não deve chamar callback)
        progress_hook({
            'status': 'downloading',
            'downloaded_bytes': 5000,
            'total_bytes': 0
        })
        assert len(progress_called) == 2
        
        # Testar erro no callback (deve ser ignorado)
        def error_callback(progress):
            raise Exception("Callback error")
        
        filepath2 = YouTubeService.download_video("test789", "/output", error_callback)
        
        # Capturar novo hook
        progress_hook2 = captured_opts['progress_hooks'][0]
        progress_hook2({
            'status': 'downloading',
            'downloaded_bytes': 5000,
            'total_bytes': 10000
        })
        
        # Não deve lançar erro
        assert filepath == "/path/test456.mp4"
    
    @patch('app.services.youtube.yt_dlp.YoutubeDL')
    def test_download_video_error(self, mock_yt_dlp):
        """Deve lançar erro quando download falhar"""
        mock_ydl_instance = MagicMock()
        mock_yt_dlp.return_value.__enter__.return_value = mock_ydl_instance
        mock_ydl_instance.extract_info.side_effect = Exception("Download failed")
        
        with pytest.raises(Exception, match="Erro ao baixar vídeo"):
            YouTubeService.download_video("test789", "/output")
    
    def test_youtube_service_singleton(self):
        """Deve ter uma instância singleton do serviço"""
        assert youtube_service is not None
        assert isinstance(youtube_service, YouTubeService)
