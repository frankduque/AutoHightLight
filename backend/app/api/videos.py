from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.video import (
    VideoMetadataResponse,
    VideoCreate,
    VideoResponse,
    VideoListResponse
)
from app.models.video import Video, VideoStatus
from app.services.youtube import youtube_service
from datetime import datetime
from loguru import logger

router = APIRouter()

@router.post("/fetch-metadata")
async def fetch_video_metadata(url: dict, db: Session = Depends(get_db)):
    """Busca metadados de um vídeo do YouTube ou retorna vídeo existente"""
    try:
        video_url = url.get("url")
        if not video_url:
            raise HTTPException(status_code=400, detail="URL é obrigatória")
        
        # Extrai youtube_id da URL primeiro
        youtube_id = youtube_service.extract_video_id(video_url)
        if not youtube_id:
            raise HTTPException(status_code=400, detail="URL inválida do YouTube")
        
        # Verifica se já existe no BD
        existing = db.query(Video).filter(Video.youtube_id == youtube_id).first()
        if existing:
            logger.info(f"Vídeo já existe no BD: {existing.id} - {existing.title}")
            return {
                "exists": True,
                "video_id": existing.id,
                "video": existing
            }
        
        # Se não existe, busca metadados do YouTube
        metadata = youtube_service.fetch_metadata(video_url)
        return {
            "exists": False,
            "metadata": metadata
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erro ao buscar metadados: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar metadados do vídeo")

@router.post("", response_model=VideoResponse)
async def create_video(video_data: VideoCreate, db: Session = Depends(get_db)):
    """Cria um novo registro de vídeo ou retorna existente"""
    # Verifica se já existe
    existing = db.query(Video).filter(Video.youtube_id == video_data.youtube_id).first()
    if existing:
        logger.info(f"Vídeo já existe no BD: {existing.id} - {existing.title}")
        return existing
    
    video = Video(
        youtube_id=video_data.youtube_id,
        title=video_data.title,
        description=video_data.description,
        thumbnail_url=video_data.thumbnail_url,
        duration_seconds=video_data.duration_seconds,
        channel_name=video_data.channel_name,
        channel_id=video_data.channel_id,
        channel_thumbnail=video_data.channel_thumbnail,
        view_count=video_data.view_count,
        like_count=video_data.like_count,
        comment_count=video_data.comment_count,
        published_at=video_data.published_at,
        status=VideoStatus.pending
    )
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    logger.info(f"Vídeo criado: {video.id} - {video.title}")
    
    return video

@router.get("", response_model=VideoListResponse)
async def list_videos(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lista vídeos com filtros opcionais"""
    query = db.query(Video).filter(Video.deleted_at.is_(None))
    
    if status:
        try:
            status_enum = VideoStatus[status]
            query = query.filter(Video.status == status_enum)
        except KeyError:
            raise HTTPException(status_code=400, detail=f"Status inválido: {status}")
    
    total = query.count()
    videos = query.order_by(Video.created_at.desc()).limit(limit).all()
    
    return VideoListResponse(videos=videos, total=total)

@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(video_id: int, db: Session = Depends(get_db)):
    """Busca detalhes de um vídeo"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    return video

@router.delete("/{video_id}")
async def delete_video(video_id: int, db: Session = Depends(get_db)):
    """Deleta um vídeo (soft delete)"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    video.deleted_at = datetime.now()
    db.commit()
    
    logger.info(f"Vídeo deletado: {video.id}")
    
    return {"message": "Vídeo deletado com sucesso"}

@router.post("/{video_id}/download")
async def start_download(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inicia o download de um vídeo"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status not in [VideoStatus.pending, VideoStatus.failed]:
        raise HTTPException(status_code=400, detail=f"Vídeo já está em processamento (status: {video.status.value})")
    
    # Atualiza status
    video.status = VideoStatus.downloading
    video.download_progress = 0.0
    video.download_error = None
    db.commit()
    
    # Agenda download em background
    from app.services.download import download_video_task
    background_tasks.add_task(download_video_task, video_id)
    
    logger.info(f"Download iniciado para vídeo: {video.id}")
    
    return {"message": "Download iniciado", "video_id": video_id}

@router.get("/{video_id}/download-progress")
async def get_download_progress(video_id: int, db: Session = Depends(get_db)):
    """Retorna o progresso do download"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    return {
        "video_id": video_id,
        "status": video.status.value,
        "progress": video.download_progress,
        "error": video.download_error
    }
