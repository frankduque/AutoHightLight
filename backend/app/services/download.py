from app.db.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.services.youtube import youtube_service
from app.config.settings import settings
from datetime import datetime
from loguru import logger
import os

def download_video_task(video_id: int):
    """Task em background para baixar vídeo"""
    db = SessionLocal()
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.error(f"Vídeo {video_id} não encontrado")
            return
        
        logger.info(f"Iniciando download do vídeo: {video.id} - {video.title}")
        
        # Cria diretório se não existir
        os.makedirs(settings.DOWNLOADS_PATH, exist_ok=True)
        
        # Callback para atualizar progresso
        def update_progress(progress: float):
            video.download_progress = round(progress, 2)
            db.commit()
            logger.info(f"Progresso do download {video.id}: {progress:.1f}%")
        
        # Faz o download
        filepath = youtube_service.download_video(
            video.youtube_id,
            settings.DOWNLOADS_PATH,
            progress_callback=update_progress
        )
        
        # Atualiza vídeo com sucesso
        video.video_path = filepath
        video.status = VideoStatus.downloaded
        video.download_progress = 100.0
        video.downloaded_at = datetime.now()
        db.commit()
        
        logger.info(f"Download concluído: {video.id} - {filepath}")
        
    except Exception as e:
        logger.error(f"Erro no download do vídeo {video_id}: {e}")
        
        # Atualiza com erro específico de download
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatus.download_failed
            video.download_error = str(e)
            video.download_progress = 0.0
            db.commit()
    
    finally:
        db.close()
