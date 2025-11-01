from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pathlib import Path
import os
import re
from app.db.database import get_db
from app.models.video import Video, VideoStatus
from datetime import datetime
from loguru import logger

router = APIRouter()

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
