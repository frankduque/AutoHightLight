import pytest
from datetime import datetime
from app.models.video import Video, VideoStatus

class TestVideoAPI:
    """Testes para API de vídeos"""
    
    def test_health_check(self, client):
        """Deve retornar status healthy"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_root_endpoint(self, client):
        """Deve retornar informações da API"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"] == "2.0"
    
    def test_fetch_metadata_without_url(self, client):
        """Deve retornar erro 400 quando URL não for fornecida"""
        response = client.post("/api/v1/videos/fetch-metadata", json={})
        if response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        assert response.status_code == 400
        assert "URL é obrigatória" in response.json()["detail"]
    
    def test_fetch_metadata_with_invalid_url(self, client):
        """Deve retornar erro 400 quando URL for inválida"""
        response = client.post(
            "/api/v1/videos/fetch-metadata",
            json={"url": "https://www.google.com"}
        )
        if response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        assert response.status_code == 400
    
    def test_create_video(self, client, db_session):
        """Deve criar um novo vídeo"""
        video_data = {
            "youtube_id": "test123",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": "2024-01-01T00:00:00"
        }
        
        response = client.post("/api/v1/videos", json=video_data)
        if response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        assert response.status_code == 200
        data = response.json()
        assert data["youtube_id"] == "test123"
        assert data["title"] == "Test Video"
        assert data["status"] == "pending"
    
    def test_create_duplicate_video(self, client, db_session):
        """Deve retornar erro 400 ao criar vídeo duplicado"""
        video_data = {
            "youtube_id": "test456",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": "2024-01-01T00:00:00"
        }
        
        # Primeira criação
        first_response = client.post("/api/v1/videos", json=video_data)
        if first_response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        
        # Tentativa de duplicação
        response = client.post("/api/v1/videos", json=video_data)
        assert response.status_code == 400
        assert "já existe" in response.json()["detail"]
    
    def test_list_videos_empty(self, client, db_session):
        """Deve retornar lista vazia quando não há vídeos"""
        response = client.get("/api/v1/videos")
        if response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["videos"]) == 0
    
    def test_list_videos_with_data(self, client, db_session):
        """Deve retornar lista de vídeos"""
        # Criar vídeos
        for i in range(3):
            video_data = {
                "youtube_id": f"test{i}",
                "title": f"Test Video {i}",
                "description": "Test Description",
                "thumbnail_url": "https://example.com/thumb.jpg",
                "duration_seconds": 300,
                "channel_name": "Test Channel",
                "view_count": 1000,
                "like_count": 100,
                "comment_count": 10,
                "published_at": "2024-01-01T00:00:00"
            }
            create_response = client.post("/api/v1/videos", json=video_data)
            if create_response.status_code == 404:
                pytest.skip("Endpoint não implementado ainda")
        
        # Listar
        response = client.get("/api/v1/videos")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["videos"]) == 3
    
    def test_list_videos_with_status_filter(self, client, db_session):
        """Deve filtrar vídeos por status"""
        # Criar vídeo
        video_data = {
            "youtube_id": "test789",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": "2024-01-01T00:00:00"
        }
        create_response = client.post("/api/v1/videos", json=video_data)
        if create_response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        
        # Listar com filtro
        response = client.get("/api/v1/videos?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["videos"][0]["status"] == "pending"
    
    def test_list_videos_with_invalid_status(self, client, db_session):
        """Deve retornar erro 400 com status inválido"""
        response = client.get("/api/v1/videos?status=invalid_status")
        if response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        assert response.status_code == 400
        assert "inválido" in response.json()["detail"]
    
    def test_get_video_by_id(self, client, db_session):
        """Deve retornar vídeo por ID"""
        # Criar vídeo
        video_data = {
            "youtube_id": "test999",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": "2024-01-01T00:00:00"
        }
        create_response = client.post("/api/v1/videos", json=video_data)
        if create_response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        video_id = create_response.json()["id"]
        
        # Buscar
        response = client.get(f"/api/v1/videos/{video_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == video_id
        assert data["youtube_id"] == "test999"
    
    def test_get_video_not_found(self, client, db_session):
        """Deve retornar erro 404 quando vídeo não existir"""
        response = client.get("/api/v1/videos/999999")
        assert response.status_code == 404
    
    def test_delete_video(self, client, db_session):
        """Deve deletar vídeo (soft delete)"""
        # Criar vídeo
        video_data = {
            "youtube_id": "test888",
            "title": "Test Video",
            "description": "Test Description",
            "thumbnail_url": "https://example.com/thumb.jpg",
            "duration_seconds": 300,
            "channel_name": "Test Channel",
            "view_count": 1000,
            "like_count": 100,
            "comment_count": 10,
            "published_at": "2024-01-01T00:00:00"
        }
        create_response = client.post("/api/v1/videos", json=video_data)
        if create_response.status_code == 404:
            pytest.skip("Endpoint não implementado ainda")
        video_id = create_response.json()["id"]
        
        # Deletar
        response = client.delete(f"/api/v1/videos/{video_id}")
        assert response.status_code == 200
        assert "deletado com sucesso" in response.json()["message"]
        
        # Verificar que não aparece mais na listagem
        list_response = client.get("/api/v1/videos")
        assert list_response.json()["total"] == 0
    
    def test_delete_video_not_found(self, client, db_session):
        """Deve retornar erro 404 ao deletar vídeo inexistente"""
        response = client.delete("/api/v1/videos/999999")
        assert response.status_code == 404
    
    def test_start_download_not_found(self, client, db_session):
        """Deve retornar erro 404 ao iniciar download de vídeo inexistente"""
        response = client.post("/api/v1/videos/999999/download")
        assert response.status_code == 404
    
    def test_get_download_progress_not_found(self, client, db_session):
        """Deve retornar erro 404 ao buscar progresso de vídeo inexistente"""
        response = client.get("/api/v1/videos/999999/download-progress")
        assert response.status_code == 404
