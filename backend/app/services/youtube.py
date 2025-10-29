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
        youtube_id = YouTubeService.extract_video_id(url)
        
        if not youtube_id:
            raise ValueError("URL inválida do YouTube")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://youtube.com/watch?v={youtube_id}", download=False)
                
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
                channel_thumbnail = None
                channel_id = info.get('channel_id', '')
                uploader_url = info.get('uploader_url', '')
                
                # Tentar buscar thumbnail do canal através da página do canal
                if uploader_url or channel_id:
                    try:
                        # Usar o uploader_url (formato @nome) ou channel_url
                        channel_url = uploader_url or f"https://www.youtube.com/channel/{channel_id}"
                        
                        with yt_dlp.YoutubeDL({'quiet': True, 'extract_flat': True}) as channel_ydl:
                            channel_info = channel_ydl.extract_info(channel_url, download=False)
                            
                            # Tentar pegar thumbnail dos thumbnails do canal
                            if channel_info and 'thumbnails' in channel_info:
                                thumbnails = channel_info['thumbnails']
                                # Pegar o menor thumbnail (mais rápido para carregar)
                                if thumbnails:
                                    channel_thumbnail = thumbnails[0].get('url')
                    except:
                        # Se falhar, usar placeholder
                        pass
                
                return VideoMetadataResponse(
                    youtube_id=youtube_id,
                    title=info.get('title', 'Sem título'),
                    description=info.get('description', ''),
                    thumbnail_url=info.get('thumbnail', ''),
                    duration_seconds=duration_seconds,
                    duration_formatted=duration_formatted,
                    channel_name=info.get('uploader', 'Desconhecido'),
                    channel_id=info.get('channel_id', ''),
                    channel_thumbnail=channel_thumbnail,
                    published_at=published_at,
                    view_count=info.get('view_count') or 0,
                    like_count=info.get('like_count') or 0,
                    comment_count=info.get('comment_count') or 0,
                )
        except Exception as e:
            raise Exception(f"Erro ao buscar metadados: {str(e)}")
    
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
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://youtube.com/watch?v={youtube_id}", download=True)
                filename = ydl.prepare_filename(info)
                return filename
        except Exception as e:
            raise Exception(f"Erro ao baixar vídeo: {str(e)}")

youtube_service = YouTubeService()
