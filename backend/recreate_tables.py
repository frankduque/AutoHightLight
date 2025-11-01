from sqlalchemy import text
from app.db.database import engine, Base
from app.models.video import Video

# Drop all tables with CASCADE
with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS videos CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS highlights CASCADE"))
    conn.commit()
    print("Tabelas antigas removidas")

# Create new tables
Base.metadata.create_all(bind=engine)
print("Novas tabelas criadas com sucesso!")

# Verify
with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='videos' ORDER BY ordinal_position"))
    print("\nColunas criadas:")
    for row in result:
        print(f"  - {row[0]}")
