from sqlalchemy import text
from app.db.database import engine

with engine.connect() as conn:
    result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='videos' ORDER BY ordinal_position"))
    print('Colunas na tabela videos do PostgreSQL:')
    for row in result:
        print(f'  - {row[0]}')
