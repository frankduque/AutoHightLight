"""
Script para inicializar o banco PostgreSQL
"""
from app.db.database import engine, Base
from app.models.video import Video

def init_db():
    """Inicializa o banco de dados"""
    print("Dropando tabelas antigas...")
    Base.metadata.drop_all(bind=engine)
    print("Criando tabelas no PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✓ Banco de dados inicializado com sucesso!")

if __name__ == "__main__":
    init_db()
