# 📋 FASE 0: Setup & Estrutura Base

**Duração:** 1 dia  
**Objetivo:** Preparar ambiente de desenvolvimento completo e estruturado

---

## 🎯 Objetivos da Fase

- ✅ Repositório Git configurado e limpo
- ✅ Backend FastAPI funcionando com "Hello World"
- ✅ Frontend React funcionando com "Hello World"
- ✅ Banco de dados SQLite + Alembic configurado
- ✅ Todos os models criados e migrations rodando
- ✅ Estrutura de pastas definitiva
- ✅ Comunicação Front ↔ Back testada

---

## 📁 Estrutura Final do Projeto

```
AutoHighlights-v2/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app + rotas
│   │   ├── config.py            # Settings (Pydantic)
│   │   ├── database.py          # SQLAlchemy setup
│   │   └── models.py            # SQLAlchemy models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── video_downloader.py  # yt-dlp integration
│   │   ├── transcriber.py       # Whisper integration
│   │   ├── ai_analyzer.py       # Gemini integration
│   │   ├── clip_generator.py    # FFmpeg cutting
│   │   └── subtitle_generator.py # Subtitle generation
│   │
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── storage/                 # Gitignored
│   │   ├── videos/
│   │   ├── audio/
│   │   ├── clips/
│   │   └── temp/
│   │
│   ├── .env                     # Gitignored
│   ├── .env.example
│   ├── alembic.ini
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── public/
│   │   └── vite.svg
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── video/
│   │   │   ├── highlight/
│   │   │   └── layout/
│   │   │
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── AddVideoPage.tsx
│   │   │   ├── VideoDetailPage.tsx
│   │   │   ├── TranscriptPage.tsx
│   │   │   ├── HighlightsPage.tsx
│   │   │   └── SubtitlesPage.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts           # Axios instance
│   │   │
│   │   ├── types/
│   │   │   ├── video.ts
│   │   │   ├── highlight.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── lib/
│   │   │   └── utils.ts         # Helper functions
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── .env                     # Gitignored
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── components.json          # shadcn config
│   └── README.md
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── PHASES_OVERVIEW.md
│   └── phases/
│       ├── PHASE_0_SETUP.md
│       ├── PHASE_1_URL_METADATA.md
│       └── ...
│
├── .gitignore
└── README.md
```

---

## 🔧 PARTE 1: Setup do Repositório

### 1.1 Inicializar Git

```bash
# No diretório do projeto
git init
git branch -M main
```

### 1.2 Criar .gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# Database
*.db
*.sqlite
*.sqlite3

# Environment variables
.env
.env.local

# Storage (arquivos grandes)
backend/storage/videos/
backend/storage/audio/
backend/storage/clips/
backend/storage/temp/

# Logs
*.log
logs/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Frontend
frontend/node_modules/
frontend/dist/
frontend/build/
frontend/.env.local

# OS
.DS_Store
Thumbs.db
```

---

## 🐍 PARTE 2: Setup do Backend

### 2.1 Criar Estrutura de Pastas

```bash
mkdir -p backend/app
mkdir -p backend/services
mkdir -p backend/alembic/versions
mkdir -p backend/storage/{videos,audio,clips,temp}
```

### 2.2 Criar requirements.txt

```txt
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
alembic==1.12.1

# Settings & Validation
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0

# HTTP Client
httpx==0.25.1

# Video Processing
yt-dlp==2023.11.16
moviepy==1.0.3

# AI & Transcription
openai-whisper==20231117
google-generativeai==0.3.1

# Utils
tqdm==4.66.1
```

### 2.3 Criar Virtual Environment

```bash
cd backend
python -m venv venv

# Ativar
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### 2.4 Criar .env.example

```bash
# Database
DATABASE_URL=sqlite:///./storage/autohighlights.db

# API Keys
YOUTUBE_API_KEY=your_youtube_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Settings
DEBUG=True
API_HOST=0.0.0.0
API_PORT=8000

# Processing
WHISPER_MODEL=base
STORAGE_PATH=./storage
```

### 2.5 Copiar .env

```bash
cp .env.example .env
# Depois editar .env com chaves reais
```

### 2.6 Criar app/config.py

```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Database
    database_url: str = "sqlite:///./storage/autohighlights.db"
    
    # API Keys
    youtube_api_key: str = ""
    gemini_api_key: str = ""
    
    # API Settings
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Processing
    whisper_model: str = "base"
    storage_path: str = "./storage"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )

@lru_cache()
def get_settings() -> Settings:
    """Retorna singleton das settings"""
    return Settings()
```

### 2.7 Criar app/database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

# Engine
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}  # Necessário para SQLite
)

# Session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base para models
Base = declarative_base()

# Dependency para FastAPI
def get_db():
    """Dependency que fornece sessão do DB"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 2.8 Criar app/models.py

```python
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Channel(Base):
    """Canal do YouTube"""
    __tablename__ = "channels"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    thumbnail_url = Column(String(500))
    subscriber_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    videos = relationship("Video", back_populates="channel", cascade="all, delete-orphan")

class Video(Base):
    """Vídeo processado"""
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=True)
    
    # YouTube data
    youtube_id = Column(String(50), unique=True, nullable=False, index=True)
    url = Column(String(500), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    thumbnail_url = Column(String(500))
    duration_seconds = Column(Integer)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    
    # Processing
    status = Column(String(50), default="metadata_pending", index=True)
    # Status: metadata_pending, metadata_fetched, downloading, download_completed,
    #         transcribing, transcribed, analyzing, highlights_pending,
    #         cutting, highlights_ready, ranking, ranked, subtitling, completed, failed
    
    # Files
    video_path = Column(String(500))
    audio_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel", back_populates="videos")
    transcript = relationship("Transcript", back_populates="video", uselist=False, cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="video", cascade="all, delete-orphan")

class Transcript(Base):
    """Transcrição do vídeo"""
    __tablename__ = "transcripts"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, unique=True)
    
    content = Column(Text, nullable=False)  # Texto completo
    format = Column(String(10), default="srt")  # srt, vtt, json
    language = Column(String(10), default="pt")
    revised = Column(Boolean, default=False)  # Se foi revisado manualmente
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    video = relationship("Video", back_populates="transcript")

class Highlight(Base):
    """Highlight identificado"""
    __tablename__ = "highlights"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    
    # Timing
    start_time_seconds = Column(Float, nullable=False)
    end_time_seconds = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    
    # Content
    transcript_excerpt = Column(Text)
    
    # AI Analysis (1ª etapa)
    ai_analysis = Column(JSON)  # {impact, emotion, clarity, virality, reasoning}
    
    # AI Ranking (2ª etapa)
    ai_ranking = Column(Float)  # Score de ranqueamento
    
    # Status
    status = Column(String(50), default="pending", index=True)
    # Status: pending, analyzed, approved, rejected, cutting, 
    #         cut_completed, ranked, subtitling, ready
    
    # Files
    clip_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    video = relationship("Video", back_populates="highlights")
    subtitle = relationship("Subtitle", back_populates="highlight", uselist=False, cascade="all, delete-orphan")

class Subtitle(Base):
    """Legenda de um highlight"""
    __tablename__ = "subtitles"
    
    id = Column(Integer, primary_key=True, index=True)
    highlight_id = Column(Integer, ForeignKey("highlights.id"), nullable=False, unique=True)
    
    content = Column(Text, nullable=False)  # Conteúdo SRT/VTT
    style = Column(JSON)  # {font, size, color, position, etc}
    revised = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    highlight = relationship("Highlight", back_populates="subtitle")
```

### 2.9 Criar app/main.py (Hello World)

```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="AutoHighlights API",
    description="API para processamento de vídeos e geração de highlights",
    version="2.0.0",
    debug=settings.debug
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check"""
    return {
        "message": "AutoHighlights API v2.0.0",
        "status": "running"
    }

@app.get("/api/hello")
async def hello(db: Session = Depends(get_db)):
    """Test endpoint com DB"""
    return {
        "message": "Hello from API!",
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )
```

### 2.10 Setup Alembic

```bash
# Inicializar Alembic
alembic init alembic

# Editar alembic.ini - linha sqlalchemy.url:
# sqlalchemy.url = sqlite:///./storage/autohighlights.db

# Editar alembic/env.py - adicionar após imports:
from app.database import Base
from app.models import Channel, Video, Transcript, Highlight, Subtitle
target_metadata = Base.metadata

# Criar primeira migration
alembic revision --autogenerate -m "Initial tables"

# Rodar migration
alembic upgrade head
```

### 2.11 Testar Backend

```bash
# Rodar servidor
python -m app.main

# Ou
uvicorn app.main:app --reload

# Testar em outro terminal:
curl http://localhost:8000/
curl http://localhost:8000/api/hello

# Ou abrir no navegador:
# http://localhost:8000/docs
```

---

## ⚛️ PARTE 3: Setup do Frontend

### 3.1 Criar Projeto Vite

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

### 3.2 Instalar Dependências Base

```bash
# Dependências principais
npm install react-router-dom @tanstack/react-query axios zustand

# TailwindCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn-ui@latest init

# Responder:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

### 3.3 Configurar Tailwind (tailwind.config.js)

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
}
```

### 3.4 Adicionar componentes shadcn

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dialog
```

### 3.5 Criar .env.example

```bash
VITE_API_URL=http://localhost:8000
```

```bash
# Copiar
cp .env.example .env
```

### 3.6 Criar src/services/api.ts

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

### 3.7 Criar src/types/api.ts

```typescript
export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface HealthCheck {
  message: string;
  status: string;
}
```

### 3.8 Atualizar src/App.tsx (Hello World)

```typescript
import { useEffect, useState } from 'react';
import { api } from './services/api';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

interface HelloResponse {
  message: string;
  database?: string;
}

function App() {
  const [apiStatus, setApiStatus] = useState<string>('checking...');
  const [helloMessage, setHelloMessage] = useState<string>('');

  const checkAPI = async () => {
    try {
      const { data } = await api.get<HelloResponse>('/');
      setApiStatus('✅ Connected');
    } catch (error) {
      setApiStatus('❌ Not connected');
    }
  };

  const testHello = async () => {
    try {
      const { data } = await api.get<HelloResponse>('/api/hello');
      setHelloMessage(data.message);
    } catch (error) {
      setHelloMessage('Error calling API');
    }
  };

  useEffect(() => {
    checkAPI();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🎬 AutoHighlights v2</CardTitle>
          <CardDescription>Frontend Setup Test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">API Status:</p>
            <p className="font-medium">{apiStatus}</p>
          </div>

          <Button onClick={testHello} className="w-full">
            Test API Call
          </Button>

          {helloMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{helloMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
```

### 3.9 Testar Frontend

```bash
npm run dev

# Abrir: http://localhost:5173
# Clicar em "Test API Call"
# Deve mostrar mensagem do backend
```

---

## ✅ Checklist de Conclusão da Fase 0

### Backend
- [ ] Git inicializado
- [ ] .gitignore configurado
- [ ] Virtual env criado e ativado
- [ ] Dependências instaladas (`requirements.txt`)
- [ ] `.env` criado com configurações
- [ ] `app/config.py` criado
- [ ] `app/database.py` criado
- [ ] `app/models.py` com 5 models criados
- [ ] Alembic configurado
- [ ] Migration inicial criada e rodada
- [ ] Banco de dados criado (`autohighlights.db`)
- [ ] `app/main.py` funcionando
- [ ] FastAPI rodando em `localhost:8000`
- [ ] `/docs` acessível (Swagger UI)
- [ ] Endpoint `/api/hello` retornando dados

### Frontend
- [ ] Projeto Vite criado
- [ ] Dependências instaladas
- [ ] TailwindCSS configurado
- [ ] shadcn/ui instalado e configurado
- [ ] Componentes básicos adicionados
- [ ] `.env` criado
- [ ] `services/api.ts` criado
- [ ] `types/api.ts` criado
- [ ] `App.tsx` atualizado com teste
- [ ] Frontend rodando em `localhost:5173`
- [ ] Consegue chamar API do backend
- [ ] Botão "Test API Call" funcionando

### Integração
- [ ] Frontend consegue conectar no backend
- [ ] CORS configurado corretamente
- [ ] Comunicação bidirecional testada

### Documentação
- [ ] README.md na raiz
- [ ] README.md no backend
- [ ] README.md no frontend
- [ ] Estrutura de pastas documentada

---

## 🎯 Critério de "Pronto"

**A Fase 0 está completa quando:**

1. ✅ Backend responde em `http://localhost:8000`
2. ✅ Frontend renderiza em `http://localhost:5173`
3. ✅ Frontend consegue chamar API e exibir resposta
4. ✅ Banco de dados existe com todas as tabelas
5. ✅ Alembic migrations funcionando
6. ✅ Todos os models definidos e testados
7. ✅ Git configurado e primeiro commit feito

---

## 🚀 Comandos Rápidos

### Backend
```bash
cd backend
source venv/bin/activate  # ou venv\Scripts\activate no Windows
python -m app.main
```

### Frontend
```bash
cd frontend
npm run dev
```

### Acessar
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Frontend: http://localhost:5173

---

## 📝 Próxima Fase

Após conclusão da Fase 0:
→ **FASE 1: URL → Fetch Metadata → Review**

---

**Status:** ⏳ Em Andamento  
**Última Atualização:** 2025-10-28
