from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.db.database import init_db
from app.api import videos
from loguru import logger
import sys

# Configurar logger
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>")
logger.add("logs/app.log", rotation="500 MB", retention="10 days")

# Criar aplicação
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(
    videos.router,
    prefix=f"{settings.API_V1_STR}/videos",
    tags=["videos"]
)

@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar a aplicação"""
    logger.info("Iniciando AutoHighlights API...")
    
    # Inicializar banco de dados
    init_db()
    logger.info("Banco de dados inicializado")
    
    # Criar diretórios de storage
    import os
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.DOWNLOADS_PATH, exist_ok=True)
    os.makedirs(settings.VIDEOS_PATH, exist_ok=True)
    os.makedirs(settings.TRANSCRIPTS_PATH, exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    logger.info("Diretórios de storage criados")

@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao desligar a aplicação"""
    logger.info("Desligando AutoHighlights API...")

@app.get("/")
async def root():
    """Health check"""
    return {
        "message": "AutoHighlights API está rodando!",
        "version": "2.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = settings.BACKEND_PORT if hasattr(settings, 'BACKEND_PORT') else settings.API_PORT
    logger.info(f"Iniciando servidor na porta {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
