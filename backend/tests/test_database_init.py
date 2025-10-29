import pytest
from app.db.database import init_db, engine
from app.models.video import Video

class TestDatabaseInit:
    """Testes para inicialização do banco de dados"""
    
    def test_init_db_function(self):
        """Deve executar init_db sem erros"""
        # Isso criará todas as tabelas
        init_db()
        
        # Verificar que as tabelas foram criadas
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        assert "videos" in tables
    
    def test_video_repr(self, db_session):
        """Deve gerar repr correto para Video"""
        video = Video(
            youtube_id="repr_test",
            title="This is a very long title that should be truncated in repr method",
            description="Test",
            duration_seconds=100,
            channel_name="Test"
        )
        
        db_session.add(video)
        db_session.commit()
        db_session.refresh(video)
        
        repr_str = repr(video)
        
        assert "Video" in repr_str
        assert "repr_test" in repr_str
        assert "This is a very long title that should be trunca" in repr_str
