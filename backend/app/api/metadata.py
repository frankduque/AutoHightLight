from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.video import VideoMetadataResponse
from app.models.video import Video
from app.services.youtube import youtube_service
from loguru import logger

router = APIRouter()

@router.post("/fetch-metadata")
async def fetch_video_metadata(
    url: dict, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Busca metadados de um vídeo do YouTube ou retorna vídeo existente"""
    logger.info(f"=== FETCH METADATA INICIADO === URL: {url}")
    try:
        video_url = url.get("url")
        logger.info(f"URL extraída: {video_url}")
        if not video_url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
        
        # Extrai youtube_id da URL primeiro
        youtube_id = youtube_service.extract_video_id(video_url)
        logger.info(f"YouTube ID extraído: {youtube_id}")
        if not youtube_id:
            raise HTTPException(status_code=400, detail="URL inválida do YouTube")
        
        # Verifica se já existe no BD
        existing = db.query(Video).filter(Video.youtube_id == youtube_id).first()
        if existing:
            logger.info(f"Vídeo já existe no BD: {existing.id} - {existing.title}")
            
            # Se não tem channel_thumbnail, agenda busca em background
            if not existing.channel_thumbnail:
                background_tasks.add_task(
                    youtube_service.fetch_channel_thumbnail_task,
                    existing.youtube_id,
                    existing.id
                )
            
            return {
                "exists": True,
                "video_id": existing.id,
                "video": existing
            }
        
        # Se não existe, busca metadados do YouTube
        logger.info(f"Buscando metadados do YouTube para: {youtube_id}")
        metadata = youtube_service.fetch_metadata(video_url)
        logger.info(f"Metadados obtidos com sucesso: {metadata.title}")
        
        return {
            "exists": False,
            "metadata": metadata
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao buscar metadados: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar metadados do vídeo")

@router.post("/{video_id}/refresh-metadata")
async def refresh_metadata(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Reprocessa metadados do canal (nome e thumbnail)"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    try:
        logger.info(f"Reprocessando metadados do canal para vídeo: {video.id}")
        
        # Busca metadados atualizados do YouTube
        metadata = youtube_service.fetch_metadata(f"https://youtube.com/watch?v={video.youtube_id}")
        
        # Atualiza APENAS dados do canal
        video.channel_name = metadata.channel_name
        video.channel_id = metadata.channel_id
        db.commit()
        db.refresh(video)
        
        # Agenda busca de thumbnail do canal em background
        background_tasks.add_task(
            youtube_service.fetch_channel_thumbnail_task,
            video.youtube_id,
            video.id
        )
        
        logger.info(f"Metadados do canal reprocessados com sucesso para vídeo: {video.id}")
        return video
        
    except Exception as e:
        logger.error(f"Erro ao reprocessar metadados do canal: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao reprocessar metadados do canal: {str(e)}")
