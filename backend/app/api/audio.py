from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.video import Video, VideoStatus
from datetime import datetime
from loguru import logger

router = APIRouter()

@router.post("/{video_id}/extract-audio")
async def extract_audio(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inicia a extração de áudio do vídeo"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status != VideoStatus.downloaded or not video.download_reviewed_at:
        raise HTTPException(
            status_code=400, 
            detail="Vídeo precisa ter o download revisado antes de extrair áudio"
        )
    
    if not video.video_path:
        raise HTTPException(status_code=400, detail="Arquivo de vídeo não encontrado")
    
    # Atualiza status
    video.status = VideoStatus.extracting_audio
    video.audio_extraction_progress = 0.0
    video.audio_extraction_error = None
    db.commit()
    
    # Agenda extração em background
    from app.services.audio_extraction import extract_audio_task
    background_tasks.add_task(extract_audio_task, video_id)
    
    logger.info(f"Extração de áudio iniciada para vídeo: {video.id}")
    
    return {"message": "Extração de áudio iniciada", "video_id": video_id}

@router.get("/{video_id}/audio-progress")
async def get_audio_progress(video_id: int, db: Session = Depends(get_db)):
    """Retorna o progresso da extração de áudio"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    return {
        "video_id": video_id,
        "status": video.status.value,
        "progress": getattr(video, 'audio_extraction_progress', 0),
        "error": getattr(video, 'audio_extraction_error', None)
    }

@router.post("/{video_id}/review-audio")
async def review_audio(video_id: int, db: Session = Depends(get_db)):
    """Marca o áudio como revisado pelo usuário"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status != VideoStatus.audio_extracted:
        raise HTTPException(
            status_code=400, 
            detail=f"Áudio precisa estar extraído. Status atual: {video.status.value}"
        )
    
    # Se já foi revisado, apenas retorna
    if getattr(video, 'audio_reviewed_at', None):
        logger.info(f"Áudio já foi revisado anteriormente para vídeo: {video.id}")
        return video
    
    # Marca como revisado
    video.audio_reviewed_at = datetime.now()
    db.commit()
    db.refresh(video)
    
    logger.info(f"Áudio revisado para vídeo: {video.id}")
    
    return video

@router.get("/{video_id}/audio-stream")
async def stream_audio(video_id: int, request: Request, db: Session = Depends(get_db)):
    """Retorna o arquivo de áudio para streaming com suporte a range requests"""
    from fastapi.responses import StreamingResponse
    from pathlib import Path
    import re
    import os
    
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if not video.audio_path or not os.path.exists(video.audio_path):
        raise HTTPException(status_code=404, detail="Arquivo de áudio não encontrado")
    
    file_path = Path(video.audio_path)
    file_size = file_path.stat().st_size
    
    # Verifica se há Range request (para seek no player)
    range_header = request.headers.get("range")
    
    if range_header:
        # Parse do range header (formato: "bytes=start-end")
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            
            # Valida range
            if start >= file_size:
                raise HTTPException(status_code=416, detail="Range Not Satisfiable")
            
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            def iterfile():
                with open(file_path, 'rb') as f:
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
                'Content-Range': f'bytes {start}-{end}/{file_size}',
                'Accept-Ranges': 'bytes',
                'Content-Length': str(content_length),
                'Content-Type': 'audio/mpeg',
            }
            
            return StreamingResponse(iterfile(), status_code=206, headers=headers)
    
    # Sem range request, retorna o arquivo completo
    def iterfile():
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                yield chunk
    
    headers = {
        'Accept-Ranges': 'bytes',
        'Content-Length': str(file_size),
        'Content-Type': 'audio/mpeg',
    }
    
    return StreamingResponse(iterfile(), headers=headers)
