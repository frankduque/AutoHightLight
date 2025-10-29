# AutoHighlights Backend - Fase 1

Backend da aplicação AutoHighlights construído com FastAPI.

## Fase 1 Implementada ✅

- ✅ Input de URL do YouTube
- ✅ Busca de metadados (yt-dlp)
- ✅ Criação de vídeo no banco
- ✅ Download assíncrono do vídeo
- ✅ Tracking de progresso
- ✅ API REST completa

## Instalação

```bash
# Ativar venv
.\venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt
```

## Executar

```bash
# Ativar venv
.\venv\Scripts\Activate.ps1

# Rodar servidor
python main.py
```

Ou com uvicorn direto:

```bash
uvicorn main:app --reload --port 8001
```

## API Endpoints

### Videos

- `POST /api/videos/fetch-metadata` - Buscar metadados do YouTube
- `POST /api/videos` - Criar vídeo
- `GET /api/videos` - Listar vídeos
- `GET /api/videos/{id}` - Detalhes do vídeo
- `POST /api/videos/{id}/download` - Iniciar download
- `GET /api/videos/{id}/download-progress` - Progresso do download
- `DELETE /api/videos/{id}` - Deletar vídeo

### Documentação Interativa

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Estrutura

```
backend/
├── app/
│   ├── api/           # Endpoints da API
│   ├── models/        # Models SQLAlchemy
│   ├── schemas/       # Schemas Pydantic
│   ├── services/      # Lógica de negócio
│   ├── config/        # Configurações
│   └── db/            # Database setup
├── storage/           # Armazenamento local
│   ├── downloads/     # Vídeos baixados
│   ├── videos/        # Vídeos processados
│   └── transcripts/   # Transcrições
├── logs/              # Logs da aplicação
├── main.py            # Entry point
└── requirements.txt   # Dependências
```

## Próximas Fases

- **Fase 2**: Armazenamento e conversão de áudio
- **Fase 3**: Transcrição com Whisper
- **Fase 4**: Análise com IA (GPT-4)
- **Fase 5**: Ranqueamento e classificação
- **Fase 6**: Geração de clipes
- **Fase 7**: Publicação multi-canal
- **Fase 8**: Analytics e otimização
