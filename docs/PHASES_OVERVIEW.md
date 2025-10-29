# 📋 Fases do Projeto - Estrutura Corrigida

**Filosofia:** Cada página com review manual = 1 fase

---

## 🎯 Estratégia de Desenvolvimento

**Programação em Pares (Front + Back)**
- ✅ Desenvolver Backend e Frontend simultaneamente
- ✅ Testar integração em cada fase
- ✅ Validar UX antes de prosseguir

---

## 📦 Fases Detalhadas

### **Fase 0: Setup & Estrutura Base** ⚙️
**Duração:** 1 dia  
**Objetivo:** Preparar ambiente de desenvolvimento

**Entregáveis:**
- Git inicializado com .gitignore
- Backend: FastAPI + SQLAlchemy + Alembic configurados
- Frontend: Vite + React + TS + TailwindCSS + shadcn/ui
- Models criados (Channel, Video, Transcript, Highlight, Subtitle)
- Migrations rodando
- Hello World em ambas as pontas
- Estrutura de pastas definida

---

### **Fase 1: Adicionar Vídeo → Fetch Metadata → Review** 📹
**Duração:** 2-3 dias  
**Objetivo:** Colar URL, buscar dados, revisar antes de salvar

**Backend:**
- [ ] Endpoint: `POST /api/videos/fetch-metadata`
  - Recebe: URL do YouTube
  - Valida formato
  - Extrai youtube_id
  - Busca metadata (yt-dlp ou YouTube API)
  - Retorna: metadata completo
- [ ] Endpoint: `POST /api/videos`
  - Recebe: metadata revisado
  - Verifica/cria canal se não existir
  - Salva Video (status: metadata_fetched)
  - Retorna: video criado
- [ ] Endpoint: `GET /api/channels`
- [ ] Endpoint: `GET /api/channels/{id}`

**Frontend:**
- [ ] Página: "Adicionar Vídeo"
  - Input de URL
  - Botão "Buscar"
  - Loading state
- [ ] Componente: MetadataReview
  - Exibe thumbnail
  - Título (input editável)
  - Descrição (textarea editável)
  - Canal, views, likes, comentários (readonly)
  - Duração
  - Botões: "Cancelar" / "Confirmar e Salvar"
- [ ] Redireciona para /videos/{id} após salvar

**Status do Video:** `metadata_fetched`

---

### **Fase 2: Download do Vídeo** 📥
**Duração:** 2 dias  
**Objetivo:** Baixar vídeo e exibir progresso

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/download`
  - Atualiza status → downloading
  - Inicia download com yt-dlp (assíncrono)
  - Salva em storage/videos/{id}/
  - Atualiza status → download_completed
- [ ] Endpoint: `GET /api/videos/{id}/status`
  - Retorna status atual + progresso
- [ ] Service: VideoDownloader
  - Integração com yt-dlp
  - Progress callback
  - Error handling

**Frontend:**
- [ ] Página: VideoDetail (status: metadata_fetched)
  - Exibe metadata
  - Botão: "Iniciar Download"
- [ ] Componente: DownloadProgress
  - Barra de progresso
  - Velocidade, ETA
  - Status textual
- [ ] Polling de status durante download
- [ ] Quando completo: exibe botão "Iniciar Transcrição"

**Status do Video:** `downloading` → `download_completed`

---

### **Fase 3: Transcrição → Review** 📝
**Duração:** 3 dias  
**Objetivo:** Transcrever áudio e permitir revisão/edição

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/transcribe`
  - status → transcribing
  - Extrai áudio (FFmpeg)
  - Whisper transcreve
  - Salva Transcript no banco
  - status → transcribed
- [ ] Endpoint: `GET /api/videos/{id}/transcript`
  - Retorna transcrição completa
- [ ] Endpoint: `PUT /api/transcripts/{id}`
  - Atualiza conteúdo
  - Marca revised = true
- [ ] Service: AudioTranscriber
  - FFmpeg integration
  - Whisper integration
  - SRT/VTT output

**Frontend:**
- [ ] Página: TranscriptReview (status: transcribed)
  - Player de vídeo
  - Transcript editor (sincronizado com player)
  - Timestamps clicáveis
  - Busca no texto
  - Botões: "Salvar Alterações" / "Confirmar e Prosseguir"
- [ ] Componente: VideoPlayer
  - Controles básicos
  - Seek com timestamps
- [ ] Componente: TranscriptEditor
  - Textarea com syntax highlight
  - Auto-save (debounced)

**Status do Video:** `transcribing` → `transcribed`

---

### **Fase 4: Análise de Highlights → Review** ✂️
**Duração:** 4 dias  
**Objetivo:** IA identifica highlights, usuário revisa e aprova

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/analyze`
  - status → analyzing
  - Envia transcript para Gemini
  - Prompt: identificar TODOS momentos potenciais
  - Parse resposta JSON
  - Salva múltiplos Highlights (status: analyzed)
  - status → highlights_pending
- [ ] Endpoint: `GET /api/videos/{id}/highlights`
  - Lista highlights do vídeo
  - Filtros: status, score
- [ ] Endpoint: `PUT /api/highlights/{id}`
  - Atualiza start_time, end_time
  - Permite ajustes manuais
- [ ] Endpoint: `POST /api/highlights/{id}/approve`
  - status → approved
- [ ] Endpoint: `POST /api/highlights/{id}/reject`
  - status → rejected
- [ ] Endpoint: `POST /api/highlights` (criar manual)
- [ ] Service: AIAnalyzer
  - Integração Gemini
  - Prompt engineering
  - JSON parsing

**Frontend:**
- [ ] Página: HighlightsReview (status: highlights_pending)
  - Lista de highlights gerados
  - Filtros/ordenação
  - Contador: X aprovados, Y pendentes
- [ ] Componente: HighlightCard
  - Preview do trecho (player com start/end)
  - Transcript excerpt
  - Scores visualizados (badges/progress bars)
  - Sliders: ajustar início/fim
  - Reasoning da IA
  - Botões: Aprovar / Rejeitar / Editar
- [ ] Componente: VideoPlayerWithRange
  - Player que mostra só o trecho
  - Visual do range no timeline
- [ ] Modal: Adicionar Highlight Manual
- [ ] Ações em batch: Aprovar/Rejeitar múltiplos
- [ ] Botão global: "Prosseguir com Aprovados"

**Status do Video:** `analyzing` → `highlights_pending`  
**Status dos Highlights:** `analyzed` → `approved` ou `rejected`

---

### **Fase 5: Corte dos Highlights** 🎬
**Duração:** 2 dias  
**Objetivo:** Cortar vídeo nos trechos aprovados

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/cut-highlights`
  - status → cutting
  - Para cada highlight aprovado:
    - Corta com FFmpeg
    - Salva em storage/clips/{highlight_id}/
    - Atualiza highlight.status → cut_completed
  - status → highlights_ready
- [ ] Service: ClipGenerator
  - FFmpeg cutting
  - Progress tracking
  - Error handling por clip

**Frontend:**
- [ ] Página: CuttingProgress (status: cutting)
  - Lista highlights sendo cortados
  - Progress por clip
  - Logs em tempo real
- [ ] Quando completo: exibe botão "Ranquear Highlights"

**Status do Video:** `cutting` → `highlights_ready`  
**Status dos Highlights:** `approved` → `cut_completed`

---

### **Fase 6: Ranqueamento IA → Review** 🏆
**Duração:** 2-3 dias  
**Objetivo:** IA ranqueia highlights, usuário pode ajustar ordem

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/rank-highlights`
  - status → ranking
  - Envia highlights para Gemini (2ª análise)
  - Prompt: ranquear por ROI/viralidade
  - Atualiza ai_ranking em cada highlight
  - status → ranked
- [ ] Endpoint: `PUT /api/highlights/{id}/ranking`
  - Permite ajuste manual do ranking

**Frontend:**
- [ ] Página: RankingReview (status: ranked)
  - Lista ordenada por ai_ranking (desc)
  - Drag & drop para reordenar
  - Preview de cada highlight
  - Botão: "Confirmar Ranking"

**Status do Video:** `ranking` → `ranked`

---

### **Fase 7: Legendagem → Review** 💬
**Duração:** 3 dias  
**Objetivo:** Gerar e revisar legendas dos highlights

**Backend:**
- [ ] Endpoint: `POST /api/videos/{id}/generate-subtitles`
  - status → subtitling
  - Para cada highlight:
    - Extrai trecho do transcript
    - Gera SRT
    - Aplica com FFmpeg (hardcoded)
    - Salva Subtitle no banco
  - status → completed
- [ ] Endpoint: `GET /api/highlights/{id}/subtitle`
- [ ] Endpoint: `PUT /api/subtitles/{id}`
  - Atualiza conteúdo/estilo
  - Marca revised = true
- [ ] Endpoint: `POST /api/highlights/{id}/finalize`
  - status → ready
- [ ] Service: SubtitleGenerator
  - SRT generation
  - FFmpeg subtitle burning
  - Style configuration

**Frontend:**
- [ ] Página: SubtitlesReview (status: subtitling/completed)
  - Lista highlights com preview
- [ ] Componente: SubtitleEditor
  - Player com legenda
  - Editor de texto (SRT format)
  - Timeline de legendas
  - Style controls (font, size, position, color)
  - Preview em tempo real
- [ ] Botão por highlight: "Salvar e Finalizar"
- [ ] Quando todos finalizados: "Concluir Processo"

**Status do Video:** `subtitling` → `completed`  
**Status dos Highlights:** `cut_completed` → `ready`

---

### **Fase 8: Polish & Melhorias** ✨
**Duração:** 2-3 dias  
**Objetivo:** UX, navegação contextual, error handling

**Backend:**
- [ ] WebSocket para progress real-time
- [ ] Error handling robusto
- [ ] Logging estruturado
- [ ] Rollback em caso de erro
- [ ] Cleanup de arquivos temp

**Frontend:**
- [ ] Navegação contextual por status
- [ ] Breadcrumbs de progresso
- [ ] Toast notifications
- [ ] Error boundaries
- [ ] Loading states consistentes
- [ ] Skeleton loaders
- [ ] Confirmações de ações destrutivas
- [ ] Dashboard home (overview de vídeos)

---

## 📊 Timeline Total

```
Fase 0: Setup              [■] 1 dia
Fase 1: URL→Metadata      [■■■] 2-3 dias
Fase 2: Download          [■■] 2 dias
Fase 3: Transcrição       [■■■] 3 dias
Fase 4: Highlights        [■■■■] 4 dias
Fase 5: Corte             [■■] 2 dias
Fase 6: Ranqueamento      [■■■] 2-3 dias
Fase 7: Legendagem        [■■■] 3 dias
Fase 8: Polish            [■■■] 2-3 dias
──────────────────────────────────────
Total:                    21-29 dias (~4-6 semanas)
```

---

## 📝 Documentos de Cada Fase

Criar em `docs/phases/`:

```
PHASE_0_SETUP.md
PHASE_1_URL_METADATA.md
PHASE_2_DOWNLOAD.md
PHASE_3_TRANSCRIPTION.md
PHASE_4_HIGHLIGHTS_ANALYSIS.md
PHASE_5_CUTTING.md
PHASE_6_RANKING.md
PHASE_7_SUBTITLES.md
PHASE_8_POLISH.md
```

Cada documento conterá:
- ✅ Objetivos específicos
- ✅ Checklist completo (Backend + Frontend)
- ✅ Estrutura de código
- ✅ Exemplos de implementação
- ✅ Critérios de "pronto"

---

## 🎯 Próximo Passo

**Criar PHASE_0_SETUP.md detalhado** 🚀
