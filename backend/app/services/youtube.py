import yt_dlp
import re
from datetime import datetime
from typing import Dict, Optional
from app.schemas.video import VideoMetadataResponse

class YouTubeService:
    """Serviço para interagir com YouTube"""
    
    @staticmethod
    def extract_video_id(url: str) -> Optional[str]:
        """Extrai o ID do vídeo de uma URL do YouTube"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)',
            r'youtube\.com\/embed\/([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    @staticmethod
    def fetch_metadata(url: str) -> VideoMetadataResponse:
        """Busca metadados de um vídeo do YouTube"""
        from loguru import logger
        logger.info(f"Iniciando fetch_metadata para: {url}")
        
        youtube_id = YouTubeService.extract_video_id(url)
        
        if not youtube_id:
            raise ValueError("URL inválida do YouTube")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'skip_download': True,
            'no_check_certificate': True,
            'socket_timeout': 10,
            'ignoreerrors': True,
            'age_limit': None,
            # Otimizações para velocidade
            'youtube_include_dash_manifest': False,
            'youtube_include_hls_manifest': False,
        }
        
        logger.info(f"Extraindo info do vídeo: {youtube_id}")
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info(f"Chamando yt-dlp.extract_info...")
                info = ydl.extract_info(f"https://youtube.com/watch?v={youtube_id}", download=False)
                logger.info(f"Info extraída com sucesso")
                
                # Debug completo
                logger.info(f"=== DEBUG INFO ===")
                logger.info(f"title: {info.get('title')}")
                logger.info(f"uploader: {info.get('uploader')}")
                logger.info(f"uploader type: {type(info.get('uploader'))}")
                logger.info(f"channel: {info.get('channel')}")
                logger.info(f"channel_id: {info.get('channel_id')}")
                logger.info(f"=== FIM DEBUG ===")
                
                # Formata duração
                duration_seconds = info.get('duration', 0)
                hours = duration_seconds // 3600
                minutes = (duration_seconds % 3600) // 60
                seconds = duration_seconds % 60
                
                if hours > 0:
                    duration_formatted = f"{hours}:{minutes:02d}:{seconds:02d}"
                else:
                    duration_formatted = f"{minutes}:{seconds:02d}"
                
                # Converte published_at para datetime
                upload_date = info.get('upload_date')
                if upload_date:
                    published_at = datetime.strptime(upload_date, '%Y%m%d')
                else:
                    published_at = datetime.now()
                
                # Extrair thumbnail do canal
                # Por performance, não fazemos request extra aqui
                # O frontend pode usar um placeholder ou inicial do nome
                channel_thumbnail = None
                
                logger.info(f"Montando resposta final")
                
                # Debug: vamos ver o que vem do YouTube
                logger.info(f"uploader: {info.get('uploader')}, channel: {info.get('channel')}, channel_id: {info.get('channel_id')}")
                
                # Garante que channel_name nunca seja None
                channel_name = info.get('uploader') or info.get('channel') or info.get('channel_id') or 'Canal Desconhecido'
                if channel_name is None or channel_name == '':
                    channel_name = 'Canal Desconhecido'
                
                return VideoMetadataResponse(
                    youtube_id=youtube_id,
                    title=info.get('title') or 'Sem título',
                    description=info.get('description') or '',
                    thumbnail_url=info.get('thumbnail') or '',
                    duration_seconds=duration_seconds,
                    duration_formatted=duration_formatted,
                    channel_name=str(channel_name),  # Força conversão para string
                    channel_id=info.get('channel_id') or '',
                    channel_thumbnail=channel_thumbnail,
                    published_at=published_at,
                    view_count=info.get('view_count') or 0,
                    like_count=info.get('like_count') or 0,
                    comment_count=info.get('comment_count') or 0,
                )
        except Exception as e:
            logger.error(f"Erro ao buscar metadados: {str(e)}")
            raise Exception(f"Erro ao buscar metadados: {str(e)}")
    
    @staticmethod
    def fetch_channel_thumbnail_task(youtube_id: str, video_id: int):
        """Busca thumbnail do canal em background e atualiza no BD"""
        from app.db.database import SessionLocal
        from app.models.video import Video
        from loguru import logger
        import requests
        
        logger.info(f"[Background] Buscando thumbnail do canal para vídeo {video_id} (youtube_id: {youtube_id})")
        
        try:
            db = SessionLocal()
            try:
                video = db.query(Video).filter(Video.id == video_id).first()
                if not video:
                    logger.warning(f"[Background] Vídeo {video_id} não encontrado")
                    return
                
                channel_id = video.channel_id
                
                if not channel_id:
                    logger.warning(f"[Background] Vídeo {video_id} não tem channel_id")
                    return
                
                # Tenta URLs diretas do YouTube para avatar do canal
                # Formato: https://yt3.ggpht.com/ytc/CHANNEL_ID ou via redirects
                possible_urls = [
                    f"https://www.youtube.com/channel/{channel_id}",
                    f"https://yt3.googleusercontent.com/ytc/{channel_id}",
                ]
                
                # Tenta pegar o avatar fazendo request na página do canal
                try:
                    logger.info(f"[Background] Buscando avatar via scraping da página do canal...")
                    response = requests.get(
                        f"https://www.youtube.com/channel/{channel_id}",
                        headers={'User-Agent': 'Mozilla/5.0'},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        # Procura pela URL do avatar no HTML
                        import re
                        # Avatar geralmente está em: "avatar":{"thumbnails":[{"url":"..."}]}
                        match = re.search(r'"avatar":\{"thumbnails":\[\{"url":"([^"]+)"', response.text)
                        if match:
                            avatar_url = match.group(1)
                            logger.info(f"[Background] Avatar encontrado via scraping: {avatar_url}")
                            
                            video.channel_thumbnail = avatar_url
                            db.commit()
                            logger.info(f"[Background] Thumbnail do canal atualizado para vídeo {video_id}")
                            return
                        else:
                            logger.warning(f"[Background] Avatar não encontrado no HTML")
                            
                except Exception as e:
                    logger.warning(f"[Background] Erro no scraping: {e}")
                
                logger.warning(f"[Background] Não foi possível obter thumbnail do canal para vídeo {video_id}")
                    
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"[Background] Erro ao buscar thumbnail do canal: {e}")
    
    @staticmethod
    def download_video(youtube_id: str, output_path: str, progress_callback=None) -> str:
        """
        Baixa um vídeo do YouTube
        
        Args:
            youtube_id: ID do vídeo no YouTube
            output_path: Caminho onde salvar o vídeo
            progress_callback: Função callback para reportar progresso (opcional)
            
        Returns:
            Caminho completo do arquivo baixado
        """
        def progress_hook(d):
            if progress_callback and d['status'] == 'downloading':
                try:
                    downloaded = d.get('downloaded_bytes', 0)
                    total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                    if total > 0:
                        progress = (downloaded / total) * 100
                        progress_callback(progress)
                except:
                    pass
        
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': f'{output_path}/%(id)s.%(ext)s',
            'progress_hooks': [progress_hook] if progress_callback else [],
            'quiet': False,
            'no_warnings': False,
            # Opções para evitar 403
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['webpage', 'configs'],
                }
            },
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://youtube.com/watch?v={youtube_id}", download=True)
                filename = ydl.prepare_filename(info)
                return filename
        except Exception as e:
            raise Exception(f"Erro ao baixar vídeo: {str(e)}")

youtube_service = YouTubeService()
