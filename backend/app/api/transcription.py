from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.video import Video, VideoStatus
from datetime import datetime
from loguru import logger
import os
import json

router = APIRouter()

@router.post("/{video_id}/transcribe")
async def transcribe_video(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inicia a transcrição do áudio"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status != VideoStatus.audio_extracted or not video.audio_reviewed_at:
        # Permite retry se falhou anteriormente
        if video.status != VideoStatus.transcription_failed:
            raise HTTPException(
                status_code=400, 
                detail="Áudio precisa estar extraído e revisado antes de transcrever"
            )
    
    if not video.audio_path:
        raise HTTPException(status_code=400, detail="Arquivo de áudio não encontrado")
    
    # Atualiza status
    video.status = VideoStatus.transcribing
    video.transcription_progress = 0.0
    video.transcription_error = None
    db.commit()
    
    # Agenda transcrição em background
    from app.services.transcription import transcribe_audio_task
    background_tasks.add_task(transcribe_audio_task, video_id)
    
    logger.info(f"Transcrição iniciada para vídeo: {video.id}")
    
    return {"message": "Transcrição iniciada", "video_id": video_id}

@router.get("/{video_id}/transcription-progress")
async def get_transcription_progress(video_id: int, db: Session = Depends(get_db)):
    """Retorna o progresso da transcrição"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    return {
        "video_id": video_id,
        "status": video.status.value,
        "progress": getattr(video, 'transcription_progress', 0),
        "error": getattr(video, 'transcription_error', None)
    }

@router.get("/{video_id}/transcript")
async def get_transcript(video_id: int, db: Session = Depends(get_db)):
    """Retorna a transcrição completa"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    
    try:
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        return transcript_data
    except Exception as e:
        logger.error(f"Erro ao ler transcrição: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar transcrição")

@router.put("/{video_id}/transcript")
async def update_transcript(video_id: int, transcript: dict, db: Session = Depends(get_db)):
    """Atualiza a transcrição"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if not video.transcript_path or not os.path.exists(video.transcript_path):
        raise HTTPException(status_code=404, detail="Transcrição não encontrada")
    
    try:
        # Lê transcrição atual
        with open(video.transcript_path, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
        
        # Atualiza apenas os segmentos
        transcript_data['segments'] = transcript.get('segments', [])
        transcript_data['updated_at'] = datetime.now().isoformat()
        
        # Salva de volta
        with open(video.transcript_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Transcrição atualizada para vídeo {video_id}")
        
        return {"message": "Transcrição atualizada com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao atualizar transcrição: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar transcrição")

@router.post("/{video_id}/review-transcription")
async def review_transcription(video_id: int, db: Session = Depends(get_db)):
    """Marca a transcrição como revisada pelo usuário"""
    video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    if video.status != VideoStatus.transcribed:
        raise HTTPException(
            status_code=400, 
            detail=f"Transcrição precisa estar completa. Status atual: {video.status.value}"
        )
    
    # Se já foi revisado, apenas retorna
    if getattr(video, 'transcription_reviewed_at', None):
        logger.info(f"Transcrição já foi revisada anteriormente para vídeo: {video.id}")
        return video
    
    # Marca como revisado
    video.transcription_reviewed_at = datetime.now()
    db.commit()
    db.refresh(video)
    
    logger.info(f"Transcrição revisada para vídeo: {video.id}")
    
    return video
