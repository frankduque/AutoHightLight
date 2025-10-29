# 🎬 FASE 6: Geração de Clipes com Redimensionamento Inteligente 9:16 → Export Local

**Duração:** 6 dias  
**Objetivo:** Gerar clipes de vídeo a partir dos highlights selecionados, redimensionar para formato vertical 9:16 com detecção inteligente de pessoas, aplicar edições automáticas e salvar localmente

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Usuário acessa vídeo (status: `ranked`)
2. Seleciona highlights que deseja produzir (tipicamente os "BEST" e "GOOD")
3. Configura opções de geração:
   - Plataformas alvo (YouTube Shorts, TikTok, Instagram Reels)
   - Qualidade (1080p, 720p, etc)
   - Edições automáticas (legendas, zoom, efeitos)
4. Clica "Gerar Clipes"
5. Backend processa cada highlight selecionado:
   - Extrai segmento do vídeo original (FFmpeg)
   - Aplica ajustes de duração (se configurado na Fase 4)
   - Redimensiona para formato vertical (9:16)
   - Aplica edições automáticas (legendas, zoom, transições)
   - Renderiza e salva clipe final
6. Sistema atualiza progresso em tempo real
7. Status muda para `generating` → `completed`
8. Frontend exibe galeria de clipes gerados
9. Usuário pode fazer preview, download ou publicar direto

### Status do Vídeo
- Antes: `ranked`
- Durante: `generating`
- Depois: `completed`

### Status de Cada Clipe
- `queued`: na fila de geração
- `processing`: sendo processado
- `completed`: pronto para download
- `failed`: erro na geração

---

## 🐍 Backend - Checklist

### Endpoints
- [ ] **POST /api/videos/{id}/generate-clips**
  - Verifica status válido (`ranked`)
  - Recebe lista de highlight_ids selecionados
  - Recebe configurações de geração (incluindo crop_strategy)
  - Atualiza status para `generating`
  - Cria registros de Clip para cada highlight
  - Enfileira jobs de processamento (queue assíncrona)
  - Retorna job_id para tracking
  - Error handling: nenhum highlight selecionado, vídeo não encontrado

- [ ] **POST /api/clips/{id}/preview-crop**
  - Recebe configurações de crop (strategy + manual_params se aplicável)
  - Extrai frame de amostra do highlight
  - Aplica crop configurado
  - Retorna imagem de preview
  - Usado para usuário aprovar antes de gerar clipe final

- [ ] **GET /api/videos/{id}/clips**
  - Retorna lista de clipes gerados
  - Inclui: status, thumbnail, download_url, duration, file_size
  - Filtros: por plataforma, por status
  - Ordenação: por rank do highlight original

- [ ] **GET /api/clips/{id}**
  - Retorna detalhes de um clipe específico
  - Inclui: metadata completa, URLs de download, preview

- [ ] **GET /api/clips/{id}/download**
  - Gera URL assinada para download (tempo limitado)
  - Suporta diferentes formatos/qualidades
  - Tracking de downloads

- [ ] **POST /api/clips/{id}/regenerate**
  - Permite regenerar clipe com configurações diferentes
  - Útil se usuário não gostou do resultado
  - Mantém histórico de versões

- [ ] **DELETE /api/clips/{id}**
  - Remove clipe (arquivo e registro)
  - Soft delete: marca como deleted
  - Libera espaço em storage

- [ ] **GET /api/videos/{id}/generation-progress**
  - WebSocket ou polling endpoint
  - Retorna progresso em tempo real:
    - Total de clipes
    - Clipes completados
    - Clipe atual sendo processado
    - % de progresso do clipe atual
    - Tempo estimado restante

### Services

- [ ] **ClipGenerator** (Serviço Principal)
  - Orquestra geração de todos os clipes
  - Gerencia queue de processamento
  - Atualiza progresso em tempo real
  - Error handling e retry logic
  
  ```python
  class ClipGenerator:
      def generate_clips(self, video_id: int, highlight_ids: List[int], config: dict):
          """Gera múltiplos clipes de forma assíncrona"""
          video = get_video(video_id)
          highlights = get_highlights(highlight_ids)
          
          # Cria registros de clips
          clips = []
          for highlight in highlights:
              clip = Clip.create(
                  video_id=video_id,
                  highlight_id=highlight.id,
                  status='queued',
                  config=config
              )
              clips.append(clip)
          
          # Enfileira jobs de processamento
          for clip in clips:
              job = ClipProcessingJob.enqueue(clip.id, config)
              clip.job_id = job.id
              clip.save()
          
          return clips
      
      def process_clip(self, clip_id: int):
          """Processa um único clipe (executado em background worker)"""
          clip = get_clip(clip_id)
          clip.status = 'processing'
          clip.save()
          
          try:
              # 1. Extração do segmento
              self.update_progress(clip, 'extracting', 10)
              video_segment = VideoExtractor.extract_segment(
                  clip.video.file_path,
                  clip.highlight.start_time,
                  clip.highlight.end_time
              )
              
              # 2. Redimensionamento para vertical
              self.update_progress(clip, 'resizing', 30)
              vertical_video = VideoResizer.to_vertical(video_segment, '9:16')
              
              # 3. Aplicar edições automáticas
              self.update_progress(clip, 'editing', 50)
              edited_video = VideoEditor.apply_auto_edits(
                  vertical_video,
                  clip.config
              )
              
              # 4. Renderização final
              self.update_progress(clip, 'rendering', 80)
              final_clip = VideoRenderer.render(
                  edited_video,
                  output_format=clip.config.get('format', 'mp4'),
                  quality=clip.config.get('quality', '1080p')
              )
              
              # 5. Upload para storage
              self.update_progress(clip, 'uploading', 95)
              storage_path = StorageManager.upload(
                  final_clip,
                  f"clips/{clip.video_id}/{clip.id}.mp4"
              )
              
              # 6. Gerar thumbnail
              thumbnail = ThumbnailGenerator.generate(final_clip)
              thumbnail_path = StorageManager.upload(
                  thumbnail,
                  f"clips/{clip.video_id}/{clip.id}_thumb.jpg"
              )
              
              # 7. Atualizar registro
              clip.status = 'completed'
              clip.file_path = storage_path
              clip.thumbnail_path = thumbnail_path
              clip.file_size = get_file_size(storage_path)
              clip.duration = get_duration(final_clip)
              clip.completed_at = datetime.now()
              clip.save()
              
              self.update_progress(clip, 'completed', 100)
              
          except Exception as e:
              clip.status = 'failed'
              clip.error_message = str(e)
              clip.save()
              logger.error(f"Clip generation failed: {clip_id}", exc_info=e)
              raise
  ```

- [ ] **VideoExtractor**
  - Extrai segmento específico do vídeo original
  - Usa FFmpeg para corte preciso
  - Suporta ajustes de timestamp (extensão/corte da Fase 4)
  
  ```python
  class VideoExtractor:
      @staticmethod
      def extract_segment(video_path: str, start_time: float, end_time: float) -> str:
          """Extrai segmento usando FFmpeg"""
          output_path = f"/tmp/segment_{uuid4()}.mp4"
          
          # FFmpeg com corte preciso (keyframe seeking)
          cmd = [
              'ffmpeg',
              '-ss', str(start_time),  # seek to start
              '-i', video_path,
              '-t', str(end_time - start_time),  # duration
              '-c', 'copy',  # copy codec (rápido)
              '-avoid_negative_ts', '1',
              output_path
          ]
          
          run_command(cmd)
          return output_path
  ```

- [ ] **VideoResizer**
  - Converte para formato vertical 9:16 (Shorts/Reels/TikTok)
  - **Estratégias de crop**:
    - **Manual**: usuário define área de corte na UI
    - **Center**: crop centralizado simples
    - **Smart (detecção de pessoas)**: usa ML para detectar e centralizar pessoas
  - Suporta múltiplos aspect ratios
  - Preview em tempo real do crop antes de gerar
  
  ```python
  class VideoResizer:
      @staticmethod
      def to_vertical(input_path: str, crop_config: dict) -> str:
          """Converte para vertical com crop configurável"""
          output_path = f"/tmp/vertical_{uuid4()}.mp4"
          
          # Dimensões alvo (1080x1920 para 9:16)
          target_width, target_height = 1080, 1920
          
          crop_strategy = crop_config.get('strategy', 'smart')
          
          if crop_strategy == 'smart':
              # Usa detecção de pessoas para centralizar
              crop_params = VideoResizer.smart_crop_with_person_detection(
                  input_path, 
                  target_width, 
                  target_height
              )
          elif crop_strategy == 'manual':
              # Usa coordenadas especificadas pelo usuário
              crop_params = crop_config.get('manual_params')
          else:  # 'center'
              # Crop centralizado simples
              crop_params = VideoResizer.center_crop(input_path, target_width, target_height)
          
          # Aplica crop com FFmpeg
          cmd = [
              'ffmpeg',
              '-i', input_path,
              '-vf', f"scale={crop_params['scale_w']}:{crop_params['scale_h']}:force_original_aspect_ratio=increase,"
                     f"crop={target_width}:{target_height}:{crop_params['x']}:{crop_params['y']}",
              '-c:a', 'copy',
              output_path
          ]
          
          run_command(cmd)
          return output_path
      
      @staticmethod
      def smart_crop_with_person_detection(input_path: str, target_w: int, target_h: int) -> dict:
          """Crop inteligente com detecção de pessoas usando YOLO"""
          import cv2
          from ultralytics import YOLO
          
          # Carrega modelo YOLO (detecção de pessoas)
          model = YOLO('yolov8n.pt')  # modelo nano, rápido
          
          # Extrai alguns frames para análise (início, meio, fim)
          frames_to_analyze = extract_sample_frames(input_path, count=5)
          
          all_detections = []
          
          for frame in frames_to_analyze:
              # Detecta pessoas no frame
              results = model(frame, classes=[0])  # class 0 = person
              
              for result in results:
                  boxes = result.boxes
                  for box in boxes:
                      if box.conf > 0.5:  # confidence threshold
                          x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                          center_x = (x1 + x2) / 2
                          center_y = (y1 + y2) / 2
                          all_detections.append({'x': center_x, 'y': center_y})
          
          if all_detections:
              # Calcula posição média das pessoas detectadas
              avg_x = sum(d['x'] for d in all_detections) / len(all_detections)
              avg_y = sum(d['y'] for d in all_detections) / len(all_detections)
              
              # Obtém dimensões originais do vídeo
              video = cv2.VideoCapture(input_path)
              orig_w = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
              orig_h = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
              video.release()
              
              # Calcula parâmetros de crop centrado nas pessoas
              aspect_ratio = target_w / target_h
              
              # Determina escala necessária
              if orig_w / orig_h > aspect_ratio:
                  # Vídeo é mais largo, escala pela altura
                  scale_h = target_h
                  scale_w = int(orig_w * (target_h / orig_h))
              else:
                  # Vídeo é mais alto, escala pela largura
                  scale_w = target_w
                  scale_h = int(orig_h * (target_w / orig_w))
              
              # Calcula posição de crop para centralizar nas pessoas
              # Converte avg_x para a escala do vídeo redimensionado
              scaled_avg_x = avg_x * (scale_w / orig_w)
              
              # Centraliza crop na posição média das pessoas
              crop_x = int(scaled_avg_x - (target_w / 2))
              
              # Garante que crop não sai dos limites
              crop_x = max(0, min(crop_x, scale_w - target_w))
              crop_y = 0  # vertical, geralmente centraliza na altura
              
              return {
                  'scale_w': scale_w,
                  'scale_h': scale_h,
                  'x': crop_x,
                  'y': crop_y,
                  'detection_count': len(all_detections)
              }
          else:
              # Fallback para crop centralizado se não detectar pessoas
              logger.warning("No persons detected, falling back to center crop")
              return VideoResizer.center_crop(input_path, target_w, target_h)
      
      @staticmethod
      def center_crop(input_path: str, target_w: int, target_h: int) -> dict:
          """Crop centralizado simples"""
          import cv2
          
          video = cv2.VideoCapture(input_path)
          orig_w = int(video.get(cv2.CAP_PROP_FRAME_WIDTH))
          orig_h = int(video.get(cv2.CAP_PROP_FRAME_HEIGHT))
          video.release()
          
          aspect_ratio = target_w / target_h
          
          if orig_w / orig_h > aspect_ratio:
              scale_h = target_h
              scale_w = int(orig_w * (target_h / orig_h))
          else:
              scale_w = target_w
              scale_h = int(orig_h * (target_w / orig_w))
          
          # Centraliza crop
          crop_x = (scale_w - target_w) // 2
          crop_y = (scale_h - target_h) // 2
          
          return {
              'scale_w': scale_w,
              'scale_h': scale_h,
              'x': crop_x,
              'y': crop_y
          }
      
      @staticmethod
      def generate_crop_preview(input_path: str, timestamp: float, crop_params: dict) -> str:
          """Gera preview do crop para usuário aprovar antes de gerar"""
          import cv2
          
          # Extrai frame no timestamp especificado
          video = cv2.VideoCapture(input_path)
          video.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
          ret, frame = video.read()
          video.release()
          
          if not ret:
              raise Exception("Failed to extract frame for preview")
          
          # Aplica transformações de scale e crop
          scaled = cv2.resize(frame, (crop_params['scale_w'], crop_params['scale_h']))
          cropped = scaled[
              crop_params['y']:crop_params['y'] + 1920,
              crop_params['x']:crop_params['x'] + 1080
          ]
          
          # Salva preview
          preview_path = f"/tmp/crop_preview_{uuid4()}.jpg"
          cv2.imwrite(preview_path, cropped)
          
          return preview_path
  
  def extract_sample_frames(video_path: str, count: int = 5) -> list:
      """Extrai frames de amostra do vídeo para análise"""
      import cv2
      
      video = cv2.VideoCapture(video_path)
      total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
      fps = video.get(cv2.CAP_PROP_FPS)
      
      frames = []
      
      # Extrai frames distribuídos ao longo do vídeo
      for i in range(count):
          frame_pos = int((total_frames / (count + 1)) * (i + 1))
          video.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
          ret, frame = video.read()
          if ret:
              frames.append(frame)
      
      video.release()
      return frames
  ```

- [ ] **VideoEditor** (Edições Automáticas)
  - Aplica legendas automáticas (subtitles)
  - Zoom em momentos chave
  - Transições de entrada/saída
  - Efeitos visuais (slow-motion, freeze frame)
  - Overlay de texto (título, call-to-action)
  - Música de fundo (opcional)
  
  ```python
  class VideoEditor:
      @staticmethod
      def apply_auto_edits(input_path: str, config: dict) -> str:
          """Aplica edições automáticas baseadas em config"""
          output_path = f"/tmp/edited_{uuid4()}.mp4"
          
          filters = []
          
          # Legendas automáticas
          if config.get('add_subtitles'):
              subtitles = SubtitleGenerator.generate(input_path)
              filters.append(f"subtitles={subtitles}")
          
          # Zoom gradual (Ken Burns effect)
          if config.get('add_zoom'):
              filters.append("zoompan=z='min(zoom+0.0015,1.5)':d=125")
          
          # Fade in/out
          if config.get('add_fade'):
              filters.append("fade=in:0:30,fade=out:st={duration-1}:d=30")
          
          # Texto overlay
          if config.get('add_text'):
              text = config.get('text', '')
              filters.append(f"drawtext=text='{text}':x=(w-tw)/2:y=50:fontsize=48:fontcolor=white")
          
          # Aplicar filtros com FFmpeg
          filter_complex = ','.join(filters)
          cmd = [
              'ffmpeg',
              '-i', input_path,
              '-vf', filter_complex,
              '-c:a', 'copy',
              output_path
          ]
          
          run_command(cmd)
          return output_path
  ```

- [ ] **SubtitleGenerator**
  - Usa transcrição existente (Fase 3)
  - Sincroniza legendas com timestamps
  - Estilo otimizado para Shorts (fonte grande, fundo contrastante)
  - Formato SRT ou burned-in (hard-coded)
  
  ```python
  class SubtitleGenerator:
      @staticmethod
      def generate(video_path: str, transcript: Transcript) -> str:
          """Gera arquivo SRT de legendas"""
          srt_path = f"/tmp/subtitles_{uuid4()}.srt"
          
          # Parse transcrição com timestamps
          segments = parse_transcript_segments(transcript)
          
          # Gera SRT
          with open(srt_path, 'w', encoding='utf-8') as f:
              for i, segment in enumerate(segments):
                  f.write(f"{i+1}\n")
                  f.write(f"{format_timestamp(segment.start)} --> {format_timestamp(segment.end)}\n")
                  f.write(f"{segment.text}\n\n")
          
          return srt_path
      
      @staticmethod
      def burn_subtitles(video_path: str, srt_path: str) -> str:
          """Queima legendas no vídeo (hard-coded)"""
          output_path = f"/tmp/subtitled_{uuid4()}.mp4"
          
          cmd = [
              'ffmpeg',
              '-i', video_path,
              '-vf', f"subtitles={srt_path}:force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2'",
              output_path
          ]
          
          run_command(cmd)
          return output_path
  ```

- [ ] **ThumbnailGenerator**
  - Gera thumbnail do clipe (frame mais interessante)
  - Pode usar frame do meio ou detectar melhor momento
  - Formato: JPG otimizado
  
  ```python
  class ThumbnailGenerator:
      @staticmethod
      def generate(video_path: str, timestamp: float = None) -> str:
          """Gera thumbnail do vídeo"""
          output_path = f"/tmp/thumb_{uuid4()}.jpg"
          
          # Se timestamp não especificado, usa meio do vídeo
          if timestamp is None:
              duration = get_video_duration(video_path)
              timestamp = duration / 2
          
          cmd = [
              'ffmpeg',
              '-ss', str(timestamp),
              '-i', video_path,
              '-vframes', '1',
              '-q:v', '2',  # qualidade
              output_path
          ]
          
          run_command(cmd)
          return output_path
  ```

- [ ] **StorageManager**
  - Upload de clipes para storage (S3, local, etc)
  - Gerenciamento de espaço em disco
  - URLs assinadas para download seguro
  - CDN integration para streaming

- [ ] **ProgressTracker**
  - Tracking de progresso em tempo real
  - WebSocket para updates live
  - Persistência em Redis/DB

### Models

- [ ] **Clip** model (CRIAR novo model):
  - **video_id** (FK): vídeo original
  - **highlight_id** (FK): highlight que originou o clipe
  - **status** (Enum: queued, processing, completed, failed): estado atual
  - **job_id** (String): ID do job de processamento
  - **file_path** (String): caminho do arquivo final (local: storage/clips/)
  - **thumbnail_path** (String): caminho do thumbnail (local: storage/thumbnails/)
  - **download_url** (String): URL para download (pode ser local file:// ou HTTP)
  - **file_size** (Integer): tamanho em bytes
  - **duration** (Float): duração em segundos
  - **format** (String): formato do arquivo (mp4, webm, etc)
  - **resolution** (String): resolução (1080p, 720p, etc)
  - **platforms** (JSON): plataformas alvo (youtube, tiktok, instagram)
  - **config** (JSON): configurações usadas na geração
  - **crop_strategy** (Enum: smart, manual, center): estratégia de crop utilizada
  - **crop_params** (JSON): parâmetros de crop aplicados (x, y, scale_w, scale_h)
  - **persons_detected** (Integer): número de pessoas detectadas (se smart crop)
  - **processing_time** (Float): tempo de processamento em segundos
  - **error_message** (Text): mensagem de erro se falhou
  - **version** (Integer): versão do clipe (se regenerado)
  - **downloads_count** (Integer): contador de downloads
  - **created_at**, **completed_at**, **deleted_at**

---

## ⚛️ Frontend - Checklist

### Páginas

- [ ] **ClipGenerationPage** (/videos/{id}/generate)
  - **Seleção de highlights**:
    - Lista de highlights ranqueados (da Fase 5)
    - Checkboxes para seleção
    - Badge indicando classificação (BEST, GOOD, etc)
    - Preview rápido ao hover
    - "Selecionar todos BEST" (botão rápido)
  - **Configurações de geração**:
    - **Estratégia de crop** (radio buttons):
      - 🤖 Smart (detecção automática de pessoas) - RECOMENDADO
      - ✋ Manual (ajustar área de corte)
      - 📍 Center (centralizado simples)
    - **Preview de crop** (se manual):
      - Canvas interativo mostrando frame do vídeo
      - Retângulo de seleção arrastável (1080x1920)
      - Botão "Testar Crop" para preview
    - Plataformas alvo (multi-select: YouTube, TikTok, Instagram)
    - Qualidade de vídeo (dropdown: 1080p, 720p, 480p)
    - Edições automáticas (toggles):
      - ✓ Adicionar legendas
      - ✓ Zoom automático
      - ✓ Fade in/out
      - ✓ Texto overlay
    - Música de fundo (opcional, select de biblioteca)
  - **Preview de configuração**:
    - Imagem de preview do crop (frame de amostra)
    - Indicador se pessoas foram detectadas (para smart crop)
    - Estimativa de tamanho total
    - Tempo estimado de geração
    - Espaço necessário em disco
  - Botão "Gerar X Clipes" (destaque)

- [ ] **ClipProgressPage** (/videos/{id}/generating)
  - **Barra de progresso geral**:
    - X/Y clipes completados
    - % total de progresso
    - Tempo estimado restante
  - **Lista de clipes em processamento**:
    - Card para cada clipe
    - Status individual (queued → processing → completed)
    - Barra de progresso individual
    - Thumbnail quando completado
  - **Logs em tempo real** (opcional, para debug)
  - Botão "Cancelar tudo" (se necessário)

- [ ] **ClipGalleryPage** (/videos/{id}/clips)
  - **Grid de clipes gerados**:
    - Thumbnails grandes e clicáveis
    - Duração no canto
    - Badge de plataforma
    - Badge de qualidade
  - **Filtros**:
    - Por plataforma
    - Por classificação original
    - Por duração
  - **Ações em massa**:
    - Download múltiplos (ZIP)
    - Deletar múltiplos
    - Publicar múltiplos (Fase futura)

### Componentes

- [ ] **HighlightSelector**
  - Lista com checkboxes
  - Thumbnail + info do highlight
  - Indicador de duração e profitability
  - Select all / deselect all
  - Contador de selecionados

- [ ] **GenerationConfigPanel**
  - Form de configurações
  - **CropStrategySelector**:
    - Radio buttons para estratégias (smart/manual/center)
    - Descrição de cada estratégia
    - Badge "Recomendado" no smart
  - **ManualCropEditor** (se estratégia manual):
    - Canvas com frame do vídeo
    - Overlay de área de crop (1080x1920)
    - Controles de drag para ajustar posição
    - Zoom in/out no canvas
    - Botão "Resetar para Centro"
  - **CropPreview**:
    - Mostra preview do crop aplicado
    - Atualiza em tempo real (debounced)
    - Indicador de pessoas detectadas (smart crop)
  - Toggles e dropdowns de outras opções
  - Preview de configuração
  - Validação de opções incompatíveis

- [ ] **ProgressTracker**
  - Barra de progresso animada
  - Status em tempo real via WebSocket
  - Lista de clipes em queue/processing/completed
  - Indicador de clipe atual

- [ ] **ClipCard**
  - Thumbnail com play overlay
  - Duração e tamanho do arquivo
  - Badges de plataforma/qualidade
  - Botões de ação:
    - 🎬 Preview (modal com player)
    - ⬇️ Download
    - 🔄 Regenerar
    - 🗑️ Deletar
    - 📤 Publicar (Fase futura)

- [ ] **ClipPreviewModal**
  - Video player full screen
  - Controles de playback
  - Informações do clipe
  - Botões de ação rápida

### Lógica

- [ ] **Seleção de highlights**:
  - Inicialmente seleciona automaticamente os "BEST"
  - Permite marcar/desmarcar individualmente
  - Atualiza estimativas em tempo real

- [ ] **Validação de configuração**:
  - Verifica espaço em disco disponível
  - Alerta se configuração inválida
  - Sugere otimizações
  - **Preview de crop**:
    - Se estratégia manual, permite ajustar antes de gerar
    - Se estratégia smart, mostra preview com pessoas detectadas
    - Botão "Testar Crop" chama API de preview

- [ ] **Geração assíncrona**:
  - Inicia geração via API
  - Redireciona para página de progresso
  - Conecta WebSocket para updates

- [ ] **Tracking de progresso**:
  - Recebe updates via WebSocket
  - Atualiza UI em tempo real
  - Notificação quando completo
  - Redireciona para galeria ao finalizar

- [ ] **Galeria de clipes**:
  - Carrega clipes gerados
  - Preview em modal
  - Download direto ou múltiplo
  - Regeneração se insatisfeito

---

## 🧪 Testes

### Backend

- [ ] **Teste: Geração de clipe único**
  - Input: 1 highlight selecionado, config padrão
  - Expected: Clipe gerado, status completed, arquivo existe

- [ ] **Teste: Geração de múltiplos clipes**
  - Input: 5 highlights, config padrão
  - Expected: 5 clipes gerados, todos completed

- [ ] **Teste: Extração de segmento**
  - Input: Vídeo de 5min, extrair 00:30 - 01:00
  - Expected: Clipe de 30s gerado corretamente

- [ ] **Teste: Redimensionamento vertical - crop centralizado**
  - Input: Vídeo 16:9, strategy='center'
  - Expected: Vídeo vertical 1080x1920, crop centralizado

- [ ] **Teste: Redimensionamento vertical - crop smart**
  - Input: Vídeo com pessoas, strategy='smart'
  - Expected: Vídeo vertical com pessoas centralizadas

- [ ] **Teste: Redimensionamento vertical - crop manual**
  - Input: Vídeo 16:9, strategy='manual', coordenadas específicas
  - Expected: Vídeo vertical com crop nas coordenadas especificadas

- [ ] **Teste: Detecção de pessoas**
  - Input: Vídeo com 2 pessoas em posições diferentes
  - Expected: Crop centralizado na posição média das pessoas

- [ ] **Teste: Fallback sem detecção**
  - Input: Vídeo sem pessoas detectadas, strategy='smart'
  - Expected: Fallback para crop centralizado, warning no log

- [ ] **Teste: Preview de crop**
  - Input: Highlight + crop config
  - Expected: Imagem de preview gerada corretamente

- [ ] **Teste: Aplicação de legendas**
  - Input: Vídeo + transcrição com timestamps
  - Expected: Vídeo com legendas burned-in

- [ ] **Teste: Geração de thumbnail**
  - Input: Vídeo de 30s
  - Expected: Thumbnail JPG no timestamp correto

- [ ] **Teste: Handling de erro**
  - Input: Vídeo corrompido
  - Expected: Status failed, error_message preenchida

- [ ] **Teste: Progress tracking**
  - Input: Geração em andamento
  - Expected: Updates de progresso corretos (0-100%)

- [ ] **Teste: Regeneração de clipe**
  - Input: Clipe existente, nova config
  - Expected: Nova versão gerada, versão incrementada

- [ ] **Teste: Download de clipe**
  - Input: Clipe completed
  - Expected: URL assinada válida, download funciona

### Frontend

- [ ] **Teste: Seleção de highlights**
  - Marcar/desmarcar highlights
  - "Selecionar todos BEST" funciona
  - Contador de selecionados atualiza

- [ ] **Teste: Configuração de geração**
  - Mudar opções atualiza preview
  - Mudar estratégia de crop mostra/oculta editor manual
  - Preview de crop é gerado
  - Estimativas são calculadas
  - Validação de config inválida

- [ ] **Teste: Iniciar geração**
  - Click "Gerar" envia request
  - Redireciona para página de progresso
  - WebSocket conecta

- [ ] **Teste: Progresso em tempo real**
  - WebSocket recebe updates
  - UI atualiza barras de progresso
  - Status de clipes muda (queued → processing → completed)

- [ ] **Teste: Preview de clipe**
  - Click em clipe abre modal
  - Player funciona corretamente
  - Controles de playback respondem

- [ ] **Teste: Download de clipe**
  - Click download inicia download
  - Arquivo baixado corretamente
  - Contador de downloads incrementa

- [ ] **Teste: Filtros na galeria**
  - Filtrar por plataforma funciona
  - Filtrar por duração funciona
  - Combinar filtros funciona

### Integração

- [ ] **Teste: Fluxo completo end-to-end**
  - Fase 5 (ranqueamento) → Fase 6 (geração) → Clipes prontos

- [ ] **Teste: Performance com muitos clipes**
  - Gerar 20 clipes simultâneos
  - Sistema não trava
  - Progresso atualiza suavemente

- [ ] **Teste: Concorrência**
  - Múltiplos usuários gerando clipes
  - Queue gerencia jobs corretamente
  - Sem race conditions

---

## ✅ Critérios de Conclusão

1. ✅ Clipes são gerados a partir de highlights selecionados
2. ✅ Extração de segmento funciona corretamente
3. ✅ Redimensionamento para vertical (9:16) funciona
4. ✅ Edições automáticas (legendas, zoom, fade) funcionam
5. ✅ Thumbnails são gerados automaticamente
6. ✅ Upload para storage funciona
7. ✅ Progresso é trackado em tempo real
8. ✅ WebSocket atualiza UI ao vivo
9. ✅ Galeria de clipes exibe resultados
10. ✅ Preview de clipes funciona
11. ✅ Download de clipes funciona
12. ✅ Regeneração de clipes funciona
13. ✅ Error handling e retry funcionam
14. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **FASE 7: Publicação Automática** (opcional - publicar direto nas plataformas)

---

**Notas de Implementação:**
- **FFmpeg é essencial**: garantir instalado e configurado corretamente
- **YOLO para detecção de pessoas**: instalar `ultralytics` (pip install ultralytics)
  - YOLOv8n (nano) é rápido e eficiente para detecção em tempo real
  - Modelo é baixado automaticamente no primeiro uso (~6MB)
  - Class 0 = person no COCO dataset
- **OpenCV**: necessário para manipulação de frames (pip install opencv-python)
- **Crop inteligente**:
  - Analisa 5 frames distribuídos ao longo do vídeo
  - Detecta pessoas com confidence > 0.5
  - Calcula posição média para centralizar crop
  - Fallback para center crop se não detectar ninguém
- **Preview de crop**: gera antes de processar para usuário aprovar
- **Storage local**: salvar em `storage/clips/{video_id}/{clip_id}.mp4`
- **Queue assíncrona**: usar Celery, RQ ou similar para jobs em background
- **WebSocket**: usar Socket.io ou similar para updates em tempo real
- **Performance**: 
  - Detecção de pessoas adiciona ~5-10s ao processamento
  - Considerar cache de parâmetros de crop por vídeo
  - YOLOv8n é otimizado para CPU, mas GPU acelera muito
- **Qualidade vs velocidade**: preset FFmpeg (ultrafast/fast/medium/slow)
- **Espaço em disco**: limpar vídeos temporários após processar
- **Retry logic**: FFmpeg pode falhar, implementar retries com backoff
- **Timeouts**: clipes longos podem demorar, ajustar timeouts adequadamente
- **Monitoring**: logs detalhados e alertas de falha crítica
- **Legendas**: testar com diferentes idiomas e caracteres especiais
- **Compressão**: balancear qualidade vs tamanho do arquivo
- **Formatos**: MP4 é universal, H.264 codec para compatibilidade
- **Segurança**: validar paths para evitar directory traversal
- **Analytics**: trackear downloads, views, tempo de geração, taxa de sucesso de detecção
- **UX do crop manual**: canvas deve ser intuitivo, com guias visuais (grid, safe area)
- **Custo**: geração de vídeo é cara (CPU), otimizar processo e considerar limites
