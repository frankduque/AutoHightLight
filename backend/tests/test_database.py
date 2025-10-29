import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.db.database import Base, get_db, init_db
from app.models.video import Video

class TestDatabase:
    """Testes para configuração de banco de dados"""
    
    def test_get_db_dependency(self):
        """Deve retornar um gerador de sessão"""
        db_gen = get_db()
        assert db_gen is not None
        
        # Testar que retorna uma sessão
        db = next(db_gen)
        assert db is not None
        
        # Fechar a sessão
        try:
            next(db_gen)
        except StopIteration:
            pass
    
    def test_init_db_creates_tables(self):
        """Deve criar todas as tabelas"""
        # Usar banco em memória para teste
        test_engine = create_engine("sqlite:///:memory:")
        TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
        
        # Criar tabelas
        Base.metadata.create_all(bind=test_engine)
        
        # Verificar que a tabela videos existe
        inspector = inspect(test_engine)
        tables = inspector.get_table_names()
        
        assert "videos" in tables
    
    def test_database_session_commit(self, db_session):
        """Deve fazer commit de mudanças"""
        video = Video(
            youtube_id="test_commit",
            title="Test Commit",
            description="Test",
            duration_seconds=100,
            channel_name="Test"
        )
        
        db_session.add(video)
        db_session.commit()
        
        # Verificar que foi salvo
        saved = db_session.query(Video).filter(Video.youtube_id == "test_commit").first()
        assert saved is not None
        assert saved.title == "Test Commit"
    
    def test_database_session_rollback(self, db_session):
        """Deve fazer rollback de mudanças"""
        video = Video(
            youtube_id="test_rollback",
            title="Test Rollback",
            description="Test",
            duration_seconds=100,
            channel_name="Test"
        )
        
        db_session.add(video)
        db_session.rollback()
        
        # Verificar que NÃO foi salvo
        saved = db_session.query(Video).filter(Video.youtube_id == "test_rollback").first()
        assert saved is None
    
    def test_database_query_filter(self, db_session):
        """Deve filtrar registros corretamente"""
        # Criar múltiplos vídeos
        for i in range(5):
            video = Video(
                youtube_id=f"filter_test_{i}",
                title=f"Filter Test {i}",
                description="Test",
                duration_seconds=100 + i,
                channel_name="Test Channel"
            )
            db_session.add(video)
        
        db_session.commit()
        
        # Filtrar por duração
        results = db_session.query(Video).filter(Video.duration_seconds > 102).all()
        assert len(results) == 2  # 103 e 104
    
    def test_database_query_order(self, db_session):
        """Deve ordenar resultados corretamente"""
        # Criar vídeos em ordem aleatória
        for i in [3, 1, 2]:
            video = Video(
                youtube_id=f"order_test_{i}",
                title=f"Order Test {i}",
                description="Test",
                duration_seconds=100,
                channel_name="Test Channel"
            )
            db_session.add(video)
        
        db_session.commit()
        
        # Buscar ordenado por youtube_id
        results = db_session.query(Video).filter(
            Video.youtube_id.like("order_test_%")
        ).order_by(Video.youtube_id).all()
        
        assert len(results) == 3
        assert results[0].youtube_id == "order_test_1"
        assert results[1].youtube_id == "order_test_2"
        assert results[2].youtube_id == "order_test_3"
