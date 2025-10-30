from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import re
from pathlib import Path
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

@router.post("", response_model=VideoResponse)
async def create_video(
    video_data: VideoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
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
    
    # Agenda busca de thumbnail do canal em background (se não foi fornecido)
    if not video.channel_thumbnail:
        background_tasks.add_task(
            youtube_service.fetch_channel_thumbnail_task,
            video.youtube_id,
            video.id
        )
    
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
    
    if video.status not in [VideoStatus.pending, VideoStatus.download_failed]:
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

@router.post("/{video_id}/review-download")
async def review_download(video_id: int, db: Session = Depends(get_db)):
    """Marca o download como revisado pelo usuário"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status != VideoStatus.downloaded:
        raise HTTPException(
            status_code=400, 
            detail=f"Vídeo precisa estar com status 'downloaded'. Status atual: {video.status.value}"
        )
    
    # Se já foi revisado, apenas retorna (sem erro)
    if video.download_reviewed_at:
        logger.info(f"Download já foi revisado anteriormente para vídeo: {video.id}")
        return video
    
    # Marca como revisado
    video.download_reviewed_at = datetime.now()
    db.commit()
    db.refresh(video)
    
    logger.info(f"Download revisado para vídeo: {video.id}")
    
    return video

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

@router.get("/{video_id}/stream")
async def stream_video(video_id: int, request: Request, db: Session = Depends(get_db)):
    """Retorna o arquivo de vídeo para streaming com suporte a range requests"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if not video.video_path or not os.path.exists(video.video_path):
        raise HTTPException(status_code=404, detail="Arquivo de vídeo não encontrado")
    
    file_path = Path(video.video_path)
    file_size = file_path.stat().st_size
    
    # Verifica se há Range request (para seek no player)
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse do range header (formato: "bytes=start-end")
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            
            # Garante que não ultrapassa o tamanho do arquivo
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            def iterfile():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk_size = min(8192, remaining)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            }
            
            return StreamingResponse(
                iterfile(),
                status_code=206,  # Partial Content
                headers=headers,
                media_type="video/mp4"
            )
    
    # Sem range request, retorna o arquivo completo
    return FileResponse(
        video.video_path,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
        filename=f"{video.youtube_id}.mp4"
    )
