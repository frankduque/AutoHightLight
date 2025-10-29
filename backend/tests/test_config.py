import pytest
from app.config.settings import Settings

class TestConfig:
    """Testes para configurações"""
    
    def test_settings_initialization(self):
        """Deve carregar configurações corretamente"""
        settings = Settings()
        
        assert settings.PROJECT_NAME == "AutoHighlights API"
        assert settings.API_V1_STR == "/api"
        assert settings.BACKEND_CORS_ORIGINS is not None
    
    def test_storage_paths(self):
        """Deve definir caminhos de storage"""
        settings = Settings()
        
        assert hasattr(settings, 'STORAGE_PATH')
        assert hasattr(settings, 'DOWNLOADS_PATH')
        assert hasattr(settings, 'VIDEOS_PATH')
        assert hasattr(settings, 'TRANSCRIPTS_PATH')
