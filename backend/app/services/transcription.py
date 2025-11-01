import os
import json
from pathlib import Path
from app.db.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.config.settings import settings
from datetime import datetime
from loguru import logger

def transcribe_audio_task(video_id: int):
    """Task em background para transcrever áudio usando Whisper local"""
    db = SessionLocal()
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.error(f"Vídeo {video_id} não encontrado")
            return
        
        logger.info(f"Iniciando transcrição: {video.id} - {video.title}")
        
        if not video.audio_path or not os.path.exists(video.audio_path):
            raise Exception("Arquivo de áudio não encontrado")
        
        # Cria diretório de transcrições se não existir
        transcript_dir = settings.TRANSCRIPTS_PATH
        os.makedirs(transcript_dir, exist_ok=True)
        
        # Define caminho do arquivo de transcrição
        transcript_filename = f"{video.youtube_id}.json"
        transcript_path = os.path.join(transcript_dir, transcript_filename)
        
        logger.info(f"Transcrevendo áudio de {video.audio_path} para {transcript_path}")
        
        # Importa Whisper
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            logger.error("faster-whisper não está instalado. Instale com: pip install faster-whisper")
            raise Exception("faster-whisper não instalado")
        
        # Carrega modelo Whisper
        # Modelo small: ~460MB, melhor precisão para PT-BR
        model_size = "small"
        
        logger.info(f"Carregando modelo Whisper '{model_size}'...")
        video.transcription_progress = 5.0
        db.commit()
        
        # device="cpu" para rodar sem GPU (offline)
        # compute_type="int8" para usar menos memória
        model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8",
            download_root=os.path.join(settings.STORAGE_PATH, "whisper_models")
        )
        
        logger.info("Modelo carregado, iniciando transcrição...")
        video.transcription_progress = 10.0
        db.commit()
        
        # Transcreve o áudio
        # beam_size=5: melhor qualidade
        # language="pt": força português brasileiro
        segments_generator, info = model.transcribe(
            video.audio_path,
            beam_size=5,
            language="pt",
            vad_filter=True,  # Remove silêncios
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        logger.info(f"Idioma detectado: {info.language} (probabilidade: {info.language_probability:.2f})")
        logger.info(f"Duração do áudio: {info.duration:.2f}s")
        
        # Processa segmentos
        segments = []
        total_duration = info.duration
        last_progress = 10.0
        
        for segment in segments_generator:
            segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })
            
            # Atualiza progresso baseado no tempo processado
            progress = 10.0 + (segment.end / total_duration) * 85.0  # 10% a 95%
            
            # Atualiza DB a cada 0.5% de mudança (mais frequente)
            if progress - last_progress >= 0.5:
                video.transcription_progress = min(progress, 95.0)
                db.commit()
                db.refresh(video)
                last_progress = progress
                logger.debug(f"Progresso: {progress:.1f}% (tempo: {segment.end:.1f}s/{total_duration:.1f}s)")
        
        logger.info(f"Transcrição completa: {len(segments)} segmentos")
        
        # Prepara dados da transcrição
        transcript_data = {
            "video_id": video_id,
            "youtube_id": video.youtube_id,
            "duration": total_duration,
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": segments,
            "model": model_size,
            "created_at": datetime.now().isoformat()
        }
        
        # Salva transcrição
        logger.info(f"Salvando transcrição em {transcript_path}...")
        with open(transcript_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Transcrição salva: {transcript_path}")
        
        # Atualiza vídeo com sucesso
        video.transcript_path = transcript_path
        video.status = VideoStatus.transcribed
        video.transcription_progress = 100.0
        video.transcribed_at = datetime.now()
        db.commit()
        
        logger.info(f"Transcrição concluída: {video.id} - {len(segments)} segmentos")
        
    except Exception as e:
        logger.error(f"Erro na transcrição do vídeo {video_id}: {e}", exc_info=True)
        
        # Atualiza com erro
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatus.transcription_failed
            video.transcription_error = str(e)
            video.transcription_progress = 0.0
            db.commit()
            logger.info(f"Status atualizado para transcription_failed")
    
    finally:
        logger.info(f"Finalizando task de transcrição para vídeo {video_id}")
        db.close()
