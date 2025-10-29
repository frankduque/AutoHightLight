# 📤 FASE 7: Publicação Multi-Canal e Agendamento Estratégico

**Duração:** 5 dias  
**Objetivo:** Permitir publicação automática dos clipes gerados em múltiplos canais por plataforma (YouTube Shorts, TikTok, Instagram Reels), com estratégia multi-país, multi-idioma e agendamento inteligente

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Usuário acessa galeria de clipes gerados (da Fase 6)
2. Seleciona clipes para publicar
3. **Seleciona canais de destino**:
   - Pode ter múltiplos canais YouTube (ex: canal principal PT, canal EN, canal clips)
   - Pode ter múltiplas contas TikTok (ex: por país/idioma)
   - Pode ter múltiplas contas Instagram (ex: pessoal, empresa, regional)
4. Configura publicação para cada canal/conta:
   - **YouTube Shorts**: título, descrição, tags, privacidade (por canal)
   - **TikTok**: caption, hashtags, privacidade (por conta)
   - **Instagram Reels**: caption, hashtags, localização (por conta)
   - **Estratégia multi-idioma**: gerar variações de texto por país/idioma
5. Escolhe entre:
   - Publicar imediatamente em todos os canais
   - Agendar para data/hora específica (pode ser diferente por canal)
   - Estratégia escalonada (ex: Brasil hoje, USA amanhã)
6. Sistema autentica com APIs das plataformas (múltiplas contas)
7. Faz upload e publica clipes automaticamente em todos os canais
8. Tracking de status de publicação por canal em tempo real
9. Dashboard de publicações com analytics por canal e agregado

### Status de Publicação
- `draft`: rascunho, ainda não publicado
- `scheduled`: agendado para publicação futura
- `uploading`: upload em andamento
- `published`: publicado com sucesso
- `failed`: falha na publicação

---

## 🐍 Backend - Checklist

### Endpoints

- [ ] **GET /api/channels**
  - Lista todos os canais/contas configurados
  - Agrupa por plataforma
  - Inclui: nome, plataforma, país/idioma, status de autenticação
  - Filtros: por plataforma, por país, por status

- [ ] **POST /api/channels**
  - Adiciona novo canal/conta
  - Input: plataforma, nome/identificador, país, idioma, descrição
  - Inicia fluxo OAuth se necessário
  - Retorna channel_id

- [ ] **PUT /api/channels/{id}**
  - Atualiza configurações do canal
  - Pode mudar: nome, país, idioma, configurações padrão
  - Re-autenticar se necessário

- [ ] **DELETE /api/channels/{id}**
  - Remove canal/conta
  - Revoga acesso OAuth
  - Soft delete: mantém histórico de publicações

- [ ] **GET /api/channels/{id}/test**
  - Testa autenticação do canal
  - Verifica quotas disponíveis
  - Retorna informações da conta (nome, subscribers, etc)

- [ ] **POST /api/clips/{id}/publish**
  - Recebe configurações de publicação
  - Recebe **lista de channel_ids** (múltiplos canais)
  - Recebe configurações **por canal** (título, descrição pode variar)
  - Recebe estratégia de agendamento:
    - `immediate`: publica em todos agora
    - `simultaneous`: agendado para mesmo horário em todos
    - `staggered`: agendado com delay entre canais (ex: +1h cada)
    - `custom`: horário específico por canal
  - Cria registro de Publication para cada canal
  - Enfileira jobs de publicação
  - Retorna lista de publication_ids

- [ ] **GET /api/clips/{id}/publications**
  - Retorna lista de publicações do clipe
  - Agrupa por canal
  - Inclui: canal, plataforma, país, status, URL, analytics
  - Ordenação: por data de publicação ou por canal

- [ ] **GET /api/publications/{id}**
  - Retorna detalhes de uma publicação específica
  - Inclui: metadata completa, analytics, logs

- [ ] **PUT /api/publications/{id}**
  - Atualiza configurações de publicação (antes de publicar)
  - Permite editar título, descrição, agendamento

- [ ] **DELETE /api/publications/{id}**
  - Cancela publicação agendada
  - Remove publicação já publicada (se plataforma permitir)

- [ ] **POST /api/publications/{id}/retry**
  - Retenta publicação que falhou
  - Útil para resolver erros temporários

- [ ] **GET /api/publications/scheduled**
  - Lista todas as publicações agendadas
  - Filtros: por data, por plataforma, por usuário
  - Usado pelo scheduler para processar

- [ ] **GET /api/publications/analytics**
  - Dashboard de analytics agregado
  - Métricas: total de publicações, taxa de sucesso, por plataforma, **por canal**, **por país**
  - Views, likes, comentários agregados
  - Comparação de performance entre canais
  - Ranking de melhores canais por engajamento
  - Performance por horário de publicação
  - **ROI por canal** (views/esforço)

### OAuth & Authentication

- [ ] **Multi-Account OAuth**
  - Permite múltiplas contas da mesma plataforma
  - Cada canal tem seu próprio OAuth token
  - Fluxo: usuário escolhe "qual conta" ao autorizar

- [ ] **YouTube OAuth (Multi-Channel)**
  - Fluxo OAuth 2.0 para autenticação
  - Endpoints: `/auth/youtube/authorize?channel_name=X`, `/auth/youtube/callback`
  - Armazena access_token e refresh_token **por canal**
  - Auto-refresh quando token expira
  - Scopes: `youtube.upload`, `youtube.readonly`
  - Permite múltiplos canais do mesmo usuário Google

- [ ] **TikTok OAuth (Multi-Account)**
  - Fluxo OAuth 2.0 para autenticação
  - Endpoints: `/auth/tiktok/authorize?account_name=X`, `/auth/tiktok/callback`
  - Armazena access_token e refresh_token **por conta**
  - Scopes: `video.upload`, `user.info.basic`
  - Permite múltiplas contas TikTok

- [ ] **Instagram OAuth (Multi-Account via Facebook)**
  - Fluxo OAuth 2.0 para autenticação
  - Endpoints: `/auth/instagram/authorize?account_name=X`, `/auth/instagram/callback`
  - Requer página de negócios do Facebook **por conta**
  - Scopes: `instagram_content_publish`, `pages_show_list`
  - Permite múltiplas contas Instagram/Facebook

### Services

- [ ] **PublicationManager** (Orquestrador)
  - Gerencia ciclo de vida das publicações
  - Suporta publicação em múltiplos canais
  - Enfileira jobs de upload
  - Tracking de status por canal
  - Error handling e retry logic
  
  ```python
  class PublicationManager:
      def create_publications(self, clip_id: int, channels: List[int], configs: dict, strategy: dict):
          """Cria múltiplas publicações para diferentes canais"""
          clip = get_clip(clip_id)
          publications = []
          
          for channel_id in channels:
              channel = get_channel(channel_id)
              
              # Busca config específica do canal ou usa padrão
              channel_config = configs.get(channel_id, configs.get('default'))
              
              # Aplica localização (tradução) se configurado
              if channel_config.get('auto_translate'):
                  channel_config = self.translate_config(channel_config, channel.language)
              
              # Calcula horário de agendamento baseado em estratégia
              scheduled_at = self.calculate_schedule(channel, strategy)
              
              publication = Publication.create(
                  clip_id=clip_id,
                  channel_id=channel_id,
                  platform=channel.platform,
                  status='draft' if scheduled_at else 'queued',
                  config=channel_config,
                  scheduled_at=scheduled_at
              )
              
              publications.append(publication)
              
              if not scheduled_at:
                  # Publicar imediatamente
                  PublicationJob.enqueue(publication.id)
          
          return publications
      
      def calculate_schedule(self, channel: Channel, strategy: dict) -> datetime:
          """Calcula horário de agendamento baseado em estratégia"""
          if strategy['type'] == 'immediate':
              return None
          elif strategy['type'] == 'simultaneous':
              return strategy['scheduled_at']
          elif strategy['type'] == 'staggered':
              # Adiciona delay crescente entre canais
              base_time = strategy['scheduled_at']
              delay_minutes = strategy.get('delay_minutes', 60)
              channel_index = strategy['channels'].index(channel.id)
              return base_time + timedelta(minutes=delay_minutes * channel_index)
          elif strategy['type'] == 'custom':
              return strategy['schedules'].get(channel.id)
      
      def translate_config(self, config: dict, target_language: str) -> dict:
          """Traduz configurações para idioma do canal"""
          from deep_translator import GoogleTranslator
          
          translator = GoogleTranslator(source='auto', target=target_language)
          
          translated_config = config.copy()
          
          if 'title' in config:
              translated_config['title'] = translator.translate(config['title'])
          if 'description' in config:
              translated_config['description'] = translator.translate(config['description'])
          if 'caption' in config:
              translated_config['caption'] = translator.translate(config['caption'])
          
          return translated_config
      
      def publish_to_platform(self, publication_id: int):
          """Publica em um canal específico"""
          publication = get_publication(publication_id)
          channel = get_channel(publication.channel_id)
          
          publication.status = 'uploading'
          publication.save()
          
          try:
              platform_service = self.get_platform_service(channel.platform)
              
              # Carrega credenciais OAuth do canal
              oauth_token = get_oauth_token(channel.id)
              platform_service.set_credentials(oauth_token)
              
              # Upload e publicação
              result = platform_service.publish(
                  video_path=publication.clip.file_path,
                  config=publication.config
              )
              
              # Atualiza com sucesso
              publication.status = 'published'
              publication.external_id = result['id']
              publication.external_url = result['url']
              publication.published_at = datetime.now()
              publication.save()
              
              logger.info(f"Published to {channel.name} ({channel.platform}): {result['url']}")
              
          except Exception as e:
              publication.status = 'failed'
              publication.error_message = str(e)
              publication.save()
              logger.error(f"Publication failed: {publication_id}", exc_info=e)
              raise
  ```

- [ ] **YouTubeService**
  - Integração com YouTube Data API v3
  - Upload de vídeo como Short
  - Configuração de metadata (título, descrição, tags)
  
  ```python
  class YouTubeService:
      def __init__(self):
          self.credentials = self.load_credentials()
          self.youtube = build('youtube', 'v3', credentials=self.credentials)
      
      def publish(self, video_path: str, config: dict) -> dict:
          """Upload vídeo para YouTube Shorts"""
          
          # Metadata do vídeo
          body = {
              'snippet': {
                  'title': config['title'],
                  'description': config['description'],
                  'tags': config.get('tags', []),
                  'categoryId': '22'  # People & Blogs
              },
              'status': {
                  'privacyStatus': config.get('privacy', 'public'),
                  'selfDeclaredMadeForKids': False
              }
          }
          
          # Upload
          media = MediaFileUpload(
              video_path,
              mimetype='video/mp4',
              resumable=True,
              chunksize=1024*1024  # 1MB chunks
          )
          
          request = self.youtube.videos().insert(
              part='snippet,status',
              body=body,
              media_body=media
          )
          
          response = None
          while response is None:
              status, response = request.next_chunk()
              if status:
                  logger.info(f"Upload progress: {int(status.progress() * 100)}%")
          
          video_id = response['id']
          video_url = f"https://youtube.com/shorts/{video_id}"
          
          return {
              'id': video_id,
              'url': video_url,
              'title': config['title']
          }
      
      def load_credentials(self):
          """Carrega credenciais OAuth do usuário"""
          # Implementar lógica de carregar e refresh de tokens
          pass
  ```

- [ ] **TikTokService**
  - Integração com TikTok API
  - Upload de vídeo
  - Configuração de caption e hashtags
  
  ```python
  class TikTokService:
      def __init__(self):
          self.access_token = self.get_access_token()
          self.api_base = 'https://open-api.tiktok.com'
      
      def publish(self, video_path: str, config: dict) -> dict:
          """Upload vídeo para TikTok"""
          
          # Passo 1: Inicializar upload
          init_response = requests.post(
              f"{self.api_base}/share/video/upload/",
              headers={'Authorization': f'Bearer {self.access_token}'},
              json={
                  'video': {
                      'caption': config['caption'],
                      'privacy_level': config.get('privacy', 'PUBLIC_TO_EVERYONE'),
                      'disable_comment': config.get('disable_comments', False),
                      'disable_duet': config.get('disable_duet', False)
                  }
              }
          )
          
          upload_url = init_response.json()['data']['upload_url']
          
          # Passo 2: Upload do arquivo
          with open(video_path, 'rb') as video_file:
              upload_response = requests.put(
                  upload_url,
                  data=video_file,
                  headers={'Content-Type': 'video/mp4'}
              )
          
          video_id = init_response.json()['data']['video_id']
          
          # TikTok não fornece URL direto imediatamente
          return {
              'id': video_id,
              'url': f"https://tiktok.com/@username/video/{video_id}",  # placeholder
              'caption': config['caption']
          }
  ```

- [ ] **InstagramService**
  - Integração com Facebook Graph API
  - Upload de Reel
  - Configuração de caption e hashtags
  
  ```python
  class InstagramService:
      def __init__(self):
          self.access_token = self.get_access_token()
          self.ig_user_id = self.get_instagram_user_id()
      
      def publish(self, video_path: str, config: dict) -> dict:
          """Upload Reel para Instagram"""
          
          # Passo 1: Upload do vídeo para um servidor acessível
          # Instagram requer URL público para o vídeo
          video_url = self.upload_to_temporary_storage(video_path)
          
          # Passo 2: Criar container de mídia
          create_response = requests.post(
              f"https://graph.facebook.com/v18.0/{self.ig_user_id}/media",
              params={
                  'access_token': self.access_token,
                  'video_url': video_url,
                  'media_type': 'REELS',
                  'caption': config['caption'],
                  'share_to_feed': config.get('share_to_feed', True)
              }
          )
          
          container_id = create_response.json()['id']
          
          # Passo 3: Verificar status do processamento
          self.wait_for_processing(container_id)
          
          # Passo 4: Publicar
          publish_response = requests.post(
              f"https://graph.facebook.com/v18.0/{self.ig_user_id}/media_publish",
              params={
                  'access_token': self.access_token,
                  'creation_id': container_id
              }
          )
          
          media_id = publish_response.json()['id']
          
          return {
              'id': media_id,
              'url': f"https://instagram.com/reel/{media_id}",
              'caption': config['caption']
          }
  ```

- [ ] **PublicationScheduler** (Cron Job)
  - Executa periodicamente (a cada minuto)
  - Busca publicações agendadas com `scheduled_at <= now`
  - Enfileira jobs de publicação
  - Atualiza status para `queued`

- [ ] **OAuthManager**
  - Gerencia tokens OAuth de todas as plataformas
  - Auto-refresh de tokens expirados
  - Armazenamento seguro de credentials
  - Revogação de acesso

### Models

- [ ] **Channel** model (CRIAR novo):
  - **user_id** (FK): usuário dono do canal
  - **platform** (Enum: youtube, tiktok, instagram): plataforma
  - **name** (String): nome amigável do canal (ex: "Canal Principal BR", "TikTok USA")
  - **external_id** (String): ID do canal na plataforma externa
  - **country** (String): país alvo (ISO code: BR, US, PT, etc)
  - **language** (String): idioma do canal (ISO code: pt-BR, en-US, etc)
  - **timezone** (String): timezone do canal (para agendamentos inteligentes)
  - **description** (Text): descrição do canal/estratégia
  - **auto_translate** (Boolean): traduzir automaticamente conteúdo para idioma do canal
  - **default_config** (JSON): configurações padrão para publicações neste canal
  - **oauth_token_id** (FK): token OAuth associado
  - **status** (Enum: active, inactive, auth_expired): status do canal
  - **analytics** (JSON): estatísticas do canal (total de publicações, views, etc)
  - **created_at**, **updated_at**, **deleted_at**

- [ ] **Publication** model (ATUALIZAR):
  - **clip_id** (FK): clipe a ser publicado
  - **channel_id** (FK): **NOVO - canal de destino**
  - **platform** (Enum: youtube, tiktok, instagram): plataforma (derivado do channel)
  - **status** (Enum: draft, scheduled, queued, uploading, published, failed)
  - **config** (JSON): configurações específicas desta publicação
    - title, description, tags (YouTube)
    - caption, hashtags (TikTok, Instagram)
    - privacy, location, etc
  - **scheduled_at** (DateTime): quando publicar (null = imediato)
  - **published_at** (DateTime): quando foi efetivamente publicado
  - **external_id** (String): ID na plataforma externa
  - **external_url** (String): URL do post publicado
  - **error_message** (Text): mensagem de erro se falhou
  - **retry_count** (Integer): número de tentativas
  - **analytics** (JSON): métricas da publicação (views, likes, etc)
  - **created_at**, **updated_at**, **deleted_at**

- [ ] **OAuthToken** model (já existente):
  - **channel_id** (FK): **NOVO - canal associado** (ao invés de user_id)
  - **platform** (Enum: youtube, tiktok, instagram)
  - **access_token** (String): token de acesso (encrypted)
  - **refresh_token** (String): token de refresh (encrypted)
  - **expires_at** (DateTime): quando expira
  - **scopes** (JSON): escopos autorizados
  - **created_at**, **updated_at**

---

## ⚛️ Frontend - Checklist

### Páginas

- [ ] **ChannelManagementPage** (/channels)
  - **Lista de canais configurados**:
    - Cards agrupados por plataforma
    - Info: nome, país/idioma, status de autenticação, total de publicações
    - Badge de status (ativo, auth_expired, etc)
  - **Botão "Adicionar Canal"**:
    - Modal com form: plataforma, nome, país, idioma, timezone
    - Inicia OAuth após preencher
  - **Ações por canal**:
    - Editar configurações
    - Re-autenticar (se token expirou)
    - Testar conexão
    - Ver analytics do canal
    - Remover canal

- [ ] **PublicationConfigPage** (/clips/{id}/publish)
  - **Seleção de canais**:
    - Lista de todos os canais disponíveis
    - Checkboxes para selecionar múltiplos
    - Agrupado por plataforma
    - Indicador visual: nome, país/idioma, status
    - Filtros: por plataforma, por país, por idioma
    - Quick select: "Todos YouTube", "Todos BR", "Canais principais"
  - **Configuração por canal** (accordion ou tabs):
    - Mostra cada canal selecionado
    - Opção: usar config padrão do canal OU customizar
    - Campos específicos:
      - **YouTube**: título (100 chars), descrição (5000 chars), tags, privacidade
      - **TikTok**: caption (150 chars), hashtags, privacidade
      - **Instagram**: caption (2200 chars), hashtags, localização
    - Toggle "Auto-traduzir" (traduz config padrão para idioma do canal)
    - Preview de como ficará neste canal
  - **Estratégia de agendamento**:
    - Radio buttons:
      - ⚡ Publicar agora em todos
      - 🕐 Mesmo horário em todos (simultaneous)
      - 📅 Escalonado (staggered) - config: delay entre cada
      - ✏️ Horário customizado por canal
    - Se escalonado: input de delay (ex: 1h entre cada)
    - Se customizado: date/time picker para cada canal
    - Visualização de timeline: mostra quando cada canal publicará
  - **Resumo**:
    - Total de canais selecionados
    - Total de publicações que serão criadas
    - Timeline visual de quando cada canal publicará
  - Botão "Publicar em X Canais" ou "Agendar Publicações"

- [ ] **PublicationDashboardPage** (/publications)
  - **Resumo de publicações**:
    - Cards de métricas: 
      - Total publicados (overall e por plataforma)
      - Total agendados
      - Falhas (taxa de sucesso)
      - **Performance por canal** (top 3 canais)
      - **Performance por país** (top 3 países)
    - Gráfico de publicações por plataforma e por canal
    - Gráfico de publicações ao longo do tempo
    - **Mapa de calor**: países x performance
  - **Filtros avançados**:
    - Por plataforma
    - **Por canal**
    - **Por país**
    - Por status
    - Por data
    - Por idioma
  - **Lista de publicações**:
    - Tabela ou grid com todas as publicações
    - Colunas: clip thumbnail, **canal**, plataforma, **país**, status, data, views, ações
    - Agrupamento: por clipe (mostra todos os canais onde foi publicado)
    - Ordenação: por data, por views, por engajamento
  - **Comparação de canais**:
    - Tabela comparativa de performance por canal
    - Métricas: total posts, avg views, avg engagement, taxa de sucesso
  - **Ações em massa**:
    - Deletar múltiplas publicações agendadas
    - Republicar múltiplas falhas
    - Exportar relatório (CSV/PDF)

- [ ] **PublicationDetailPage** (/publications/{id})
  - **Informações da publicação**:
    - Clipe original (player)
    - **Canal** (nome, país, idioma)
    - Plataforma e status
    - Metadata completa (título, descrição, etc)
    - Link externo para o post
  - **Analytics** (se disponível):
    - Views, likes, comentários, shares
    - Gráfico de engajamento ao longo do tempo
    - **Comparação com outras publicações do mesmo clipe** (em outros canais)
  - **Logs**:
    - Histórico de tentativas de publicação
    - Erros (se houver)
  - **Ações**:
    - Editar (se ainda não publicado)
    - Cancelar (se agendado)
    - Retry (se falhou)
    - Republicar em outro canal
    - Deletar

### Componentes

- [ ] **ChannelCard**
  - Card visual do canal
  - Nome, plataforma, país/idioma (bandeiras)
  - Status de autenticação
  - Métricas básicas (total posts, avg views)
  - Ações: editar, testar, remover

- [ ] **ChannelSelector**
  - Lista de checkboxes de canais
  - Agrupamento visual por plataforma
  - Filtros: plataforma, país, idioma
  - Quick selects: "Todos", "Principais", "Por país"
  - Contador de selecionados

- [ ] **MultiChannelConfigForm**
  - Accordion/tabs para cada canal selecionado
  - Form dinâmico baseado na plataforma do canal
  - Toggle "Usar padrão do canal"
  - Toggle "Auto-traduzir"
  - Preview individual por canal
  - Validação específica por plataforma

- [ ] **SchedulingStrategyPicker**
  - Radio buttons para estratégias
  - Inputs configuráveis por estratégia
  - Timeline visual mostrando quando cada canal publicará
  - Validação de conflitos (ex: dois canais mesmo horário)

- [ ] **PublicationTimeline**
  - Visualização temporal das publicações
  - Linhas por canal
  - Marcadores de publicação agendada/realizada
  - Zoom in/out
  - Filtros por canal/plataforma

- [ ] **ChannelPerformanceChart**
  - Gráfico comparativo de canais
  - Métricas: views, engagement, growth
  - Filtros por período
  - Export de dados

- [ ] **PlatformConfigForm**
  - Form dinâmico baseado na plataforma
  - Validação específica por plataforma
  - Character counters em tempo real
  - Preview de como ficará o post

- [ ] **SchedulePicker**
  - Date picker + time picker
  - Timezone selector
  - Validação: não permitir agendar no passado
  - Sugestão de melhores horários (opcional)

- [ ] **PublicationStatusBadge**
  - Badge colorido indicando status
  - Ícone e cor por status:
    - draft: cinza
    - scheduled: azul
    - uploading: amarelo animado
    - published: verde
    - failed: vermelho

- [ ] **PublicationPreview**
  - Mockup visual de como ficará nas plataformas
  - Atualiza em tempo real conforme edita

- [ ] **OAuthConnectButton**
  - Abre popup OAuth da plataforma
  - Lida com callback
  - Atualiza UI após conectar

### Lógica

- [ ] **OAuth Flow**:
  - Click "Conectar" abre popup OAuth
  - Após autorização, recebe callback
  - Armazena tokens via API
  - Atualiza UI mostrando conectado

- [ ] **Validação de campos**:
  - Limites de caracteres por plataforma
  - Campos obrigatórios
  - Formato de hashtags

- [ ] **Agendamento**:
  - Valida data/hora no futuro
  - Converte timezone corretamente
  - Mostra preview de quando será publicado

- [ ] **Publicação**:
  - Submete configurações via API
  - Redireciona para dashboard
  - Notificação de sucesso/falha
  - Se imediato: mostra progresso de upload

- [ ] **Dashboard**:
  - Carrega publicações com paginação
  - Atualiza status em tempo real (polling ou WebSocket)
  - Filtros e ordenação client-side

---

## 🧪 Testes

### Backend

- [ ] **Teste: Criar múltiplos canais**
  - Input: Adicionar 3 canais YouTube de diferentes países
  - Expected: 3 canais criados, cada um com OAuth separado

- [ ] **Teste: Publicar em múltiplos canais**
  - Input: 1 clipe, 3 canais (YouTube BR, TikTok US, Instagram PT)
  - Expected: 3 publications criadas, uma para cada canal

- [ ] **Teste: Estratégia escalonada**
  - Input: Publicar em 3 canais com staggered (1h delay)
  - Expected: scheduled_at de cada canal com +1h de diferença

- [ ] **Teste: Auto-tradução**
  - Input: Config em português, publicar em canal inglês com auto_translate
  - Expected: Título e descrição traduzidos automaticamente

- [ ] **Teste: Analytics por canal**
  - Input: Mesmo clipe publicado em 2 canais
  - Expected: Analytics separados e agregados disponíveis

- [ ] **Teste: Criar publicação agendada**
  - Input: Clip + config + scheduled_at futuro
  - Expected: Publication criada com status scheduled

- [ ] **Teste: Scheduler processa agendamento**
  - Input: Publication com scheduled_at no passado
  - Expected: Scheduler enfileira job, status vira queued

- [ ] **Teste: Publicar no YouTube**
  - Input: Vídeo + metadata
  - Expected: Upload bem-sucedido, external_id e external_url preenchidos

- [ ] **Teste: Publicar no TikTok**
  - Input: Vídeo + caption
  - Expected: Upload bem-sucedido

- [ ] **Teste: Publicar no Instagram**
  - Input: Vídeo + caption
  - Expected: Upload bem-sucedido

- [ ] **Teste: Retry após falha**
  - Input: Publication com status failed
  - Expected: Retry executado, retry_count incrementado

- [ ] **Teste: OAuth refresh token**
  - Input: Token expirado
  - Expected: Sistema auto-refresh usando refresh_token

- [ ] **Teste: Cancelar publicação agendada**
  - Input: Publication scheduled
  - Expected: Status muda para cancelled, não é publicada

### Frontend

- [ ] **Teste: Conectar plataforma**
  - Click "Conectar YouTube"
  - Expected: Popup OAuth abre, após autorizar mostra "Conectado"

- [ ] **Teste: Validação de campos**
  - Input: Título YouTube com 150 caracteres
  - Expected: Erro mostrando limite de 100

- [ ] **Teste: Agendar no passado**
  - Input: Data/hora no passado
  - Expected: Erro de validação

- [ ] **Teste: Preview de post**
  - Input: Preencher título e descrição
  - Expected: Preview atualiza em tempo real

- [ ] **Teste: Publicar imediatamente**
  - Click "Publicar"
  - Expected: Request enviado, redirecionado para dashboard

- [ ] **Teste: Filtros no dashboard**
  - Filtrar por "YouTube" + "Published"
  - Expected: Mostra apenas publicações YouTube publicadas

### Integração

- [ ] **Teste: Fluxo completo multi-canal**
  - Fase 6 (clipe gerado) → Fase 7 (publicado em 5 canais) → Todos os links funcionam

- [ ] **Teste: Publicação estratégia multi-país**
  - Publicar mesmo clipe em canais BR, US, PT com horários otimizados por timezone
  - Expected: Publicações em horários de pico de cada país

---

## ✅ Critérios de Conclusão

1. ✅ OAuth funciona para todas as plataformas
2. ✅ Publicação imediata funciona
3. ✅ Agendamento funciona (scheduler processa)
4. ✅ Upload para YouTube funciona
5. ✅ Upload para TikTok funciona
6. ✅ Upload para Instagram funciona
7. ✅ Retry de falhas funciona
8. ✅ Dashboard exibe publicações
9. ✅ Filtros e busca funcionam
10. ✅ Analytics básico exibido
11. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **FASE 8: Analytics e Otimização** (tracking de performance, A/B testing, melhorias baseadas em dados)

---

**Notas de Implementação:**
- **Estratégia Multi-Canal é CRÍTICA** para escala
- **Model Channel**: centraliza gestão de contas/canais
- **Tradução automática**: usar `deep-translator` (free) ou Google Translate API
  - Cuidado com nuances culturais e gírias
  - Opção de revisão manual antes de publicar
- **Timezone awareness**: crucial para agendamento multi-país
  - Armazenar tudo em UTC internamente
  - Converter para timezone do canal ao exibir
  - Sugerir horários de pico por país/timezone
- **OAuth multi-account**: 
  - Cada canal tem seu próprio token
  - Identificar canal durante callback OAuth (usar state parameter)
  - UI clara para usuário saber "qual conta" está autorizando
- **Estratégia escalonada (staggered)**:
  - Útil para A/B testing (ver qual horário performa melhor)
  - Evitar spam (não publicar tudo de uma vez)
  - Considerar rate limits das APIs
- **Analytics por canal**:
  - Comparar performance entre canais/países
  - Identificar melhores canais para priorizar
  - ROI por canal: views/esforço
- **Performance**: 
  - Publicações em paralelo (workers independentes)
  - Queue por prioridade (canais principais primeiro)
  - Retry com backoff por canal
- **UX**:
  - Visualização clara de "onde vai publicar"
  - Timeline visual de agendamentos
  - Quick selects para facilitar (ex: "Todos BR", "Canais principais")
  - Preview de como ficará em cada canal
  - Comparação de performance entre canais
- **Compliance**:
  - Respeitar limites de cada plataforma
  - Não fazer spam (considerar delay mínimo entre posts)
  - Transparência sobre múltiplas contas (ToS)
- **Casos de uso**:
  - **Multi-idioma**: canal PT, canal EN, canal ES
  - **Multi-região**: canal BR, canal PT, canal US
  - **Multi-estratégia**: canal principal, canal clips, canal highlights
  - **Multi-plataforma**: YouTube + TikTok + Instagram do mesmo conteúdo
- **Escalabilidade**:
  - Sistema deve suportar 50+ canais sem degradação
  - Filtros e busca essenciais com muitos canais
  - Cache de configurações de canal
  - Bulk operations (publicar em todos os canais de uma vez)
