import subprocess
import os
import threading
from pathlib import Path
from app.db.database import SessionLocal
from app.models.video import Video, VideoStatus
from app.config.settings import settings
from datetime import datetime
from loguru import logger

def extract_audio_task(video_id: int):
    """Task em background para extrair áudio do vídeo usando ffmpeg"""
    db = SessionLocal()
    
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        
        if not video:
            logger.error(f"Vídeo {video_id} não encontrado")
            return
        
        logger.info(f"Iniciando extração de áudio: {video.id} - {video.title}")
        
        if not video.video_path or not os.path.exists(video.video_path):
            raise Exception("Arquivo de vídeo não encontrado")
        
        # Cria diretório de áudios se não existir
        audio_dir = os.path.join(settings.DOWNLOADS_PATH, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        
        # Define caminho do arquivo de áudio
        audio_filename = f"{video.youtube_id}.mp3"
        audio_path = os.path.join(audio_dir, audio_filename)
        
        logger.info(f"Extraindo áudio de {video.video_path} para {audio_path}")
        
        # Primeiro, pega a duração do vídeo
        probe_command = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video.video_path
        ]
        
        probe_result = subprocess.run(probe_command, capture_output=True, text=True)
        total_duration = float(probe_result.stdout.strip()) if probe_result.stdout.strip() else 0
        
        logger.info(f"Duração total do vídeo: {total_duration}s")
        
        # Comando ffmpeg para extrair áudio com progresso
        command = [
            'ffmpeg',
            '-i', video.video_path,
            '-vn',  # Sem vídeo
            '-acodec', 'libmp3lame',
            '-ab', '192k',
            '-ar', '44100',
            '-ac', '2',
            '-y',  # Sobrescrever se existir
            '-progress', 'pipe:1',  # Output de progresso
            audio_path
        ]
        
        # Executa comando com captura de progresso
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            bufsize=1
        )
        
        # Thread para consumir stderr e evitar deadlock
        stderr_lines = []
        def read_stderr():
            try:
                for line in process.stderr:
                    stderr_lines.append(line)
                    # Log stderr em tempo real para debug
                    if 'error' in line.lower() or 'warning' in line.lower():
                        logger.warning(f"FFmpeg stderr: {line.strip()}")
            except Exception as e:
                logger.error(f"Erro ao ler stderr: {e}")
        
        stderr_thread = threading.Thread(target=read_stderr, daemon=True)
        stderr_thread.start()
        logger.info("Thread stderr iniciada")
        
        # Monitora progresso
        current_time = 0
        line_count = 0
        last_progress_time = 0
        logger.info("Iniciando monitoramento de progresso do ffmpeg...")
        
        try:
            for line in process.stdout:
                line = line.strip()
                line_count += 1
                
                # Log a cada 100 linhas para debug
                if line_count % 100 == 0:
                    logger.debug(f"Processadas {line_count} linhas do ffmpeg")
                
                # Log todas as linhas que começam com 'progress' para debug
                if line.startswith('progress='):
                    logger.debug(f"Progress line: {line}")
                
                if line.startswith('out_time_ms='):
                    try:
                        microseconds = int(line.split('=')[1])
                        current_time = microseconds / 1000000.0  # Converte para segundos
                        
                        if total_duration > 0:
                            progress = min((current_time / total_duration) * 100, 99)
                            
                            # Só atualiza DB se mudou significativamente (evita muitos commits)
                            if progress - last_progress_time >= 0.1:
                                video.audio_extraction_progress = progress
                                db.commit()
                                db.refresh(video)
                                last_progress_time = progress
                                logger.debug(f"Progresso: {progress:.1f}% (tempo: {current_time:.1f}s/{total_duration:.1f}s)")
                    except Exception as e:
                        logger.warning(f"Erro ao processar linha de progresso: {line} - {e}")
                        
        except Exception as e:
            logger.error(f"Erro no loop de progresso: {e}", exc_info=True)
        
        logger.info(f"Loop de progresso finalizado após {line_count} linhas")
        logger.info(f"Tempo de progresso final: {current_time:.1f}s")
        
        # Verifica se o processo ainda está rodando
        if process.poll() is None:
            logger.info("Processo ffmpeg ainda rodando, aguardando...")
        else:
            logger.info(f"Processo ffmpeg já finalizou com código: {process.poll()}")
        
        # Aguarda conclusão com timeout
        logger.info("Aguardando conclusão do processo ffmpeg...")
        try:
            returncode = process.wait(timeout=300)  # 5 minutos de timeout
            logger.info(f"Processo ffmpeg finalizado com código: {returncode}")
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg travou! Matando processo...")
            process.kill()
            raise Exception("FFmpeg travou após 5 minutos sem resposta")
        
        # Aguarda thread do stderr
        logger.info("Aguardando thread stderr...")
        stderr_thread.join(timeout=10)
        stderr = ''.join(stderr_lines)
        
        if stderr:
            logger.info(f"STDERR do ffmpeg ({len(stderr)} chars): {stderr[-1000:]}")  # Últimos 1000 chars
        
        if returncode != 0:
            error_msg = f"Erro no ffmpeg (código {returncode}): {stderr[-500:]}"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        # Verifica se o arquivo foi criado
        logger.info(f"Verificando se arquivo de áudio foi criado: {audio_path}")
        if not os.path.exists(audio_path):
            raise Exception("Arquivo de áudio não foi criado")
        
        file_size = os.path.getsize(audio_path)
        logger.info(f"Arquivo de áudio criado com sucesso! Tamanho: {file_size / 1024 / 1024:.2f}MB")
        
        # Atualiza vídeo com sucesso
        video.audio_path = audio_path
        video.status = VideoStatus.audio_extracted
        video.audio_extraction_progress = 100.0
        video.extracted_at = datetime.now()
        db.commit()
        
        logger.info(f"Extração de áudio concluída: {video.id} - {audio_path}")
        
    except Exception as e:
        logger.error(f"Erro na extração de áudio do vídeo {video_id}: {e}", exc_info=True)
        
        # Atualiza com erro mas mantém status anterior para permitir retry
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            # Mantém o status como 'extracting_audio' ou volta para 'downloaded' 
            # para permitir retry
            video.status = VideoStatus.audio_extraction_failed
            video.audio_extraction_error = str(e)
            video.audio_extraction_progress = 0.0
            db.commit()
            logger.info(f"Status atualizado para audio_extraction_failed")
    
    finally:
        logger.info(f"Finalizando task de extração de áudio para vídeo {video_id}")
        db.close()
