# 🎬 AutoHighlights V2 - Contexto do Projeto

**Data de Criação:** 28 de Outubro de 2025  
**Versão:** 2.0  
**Status:** Em Planejamento

---

## 🎯 Visão Geral

**AutoHighlights** é um sistema para processar vídeos (YouTube e futuramente outros sites) e gerar **highlights** (cortes curtos) usando IA, com foco em controle manual em cada etapa do processo.

### Problema que Resolve

- 📹 **Criadores de conteúdo** querem aproveitar vídeos longos em múltiplas plataformas
- ⏰ **Identificar manualmente** os melhores momentos é demorado
- 💰 **Maximizar ROI** através de highlights ranqueados e otimizados
- 🎯 **Controle total** sobre cada etapa antes de prosseguir

### Filosofia do Sistema

**"Review Manual em Cada Etapa"**
- ✅ Usuário **sempre** revisa antes de prosseguir
- ✅ Ajustes manuais **sempre** disponíveis
- ✅ Status **sempre** visível e atualizado
- ✅ Navegação **contextual** baseada no status

---

## 🛠️ Stack Tecnológica Definitiva

### Backend
```
FastAPI        v0.104+    # Framework web assíncrono
SQLAlchemy     v2.0+      # ORM
SQLite         v3.40+     # Database (inicialmente)
Alembic        v1.12+     # Migrations
Pydantic       v2.5+      # Validação de dados
```

### Frontend
```
React          v18.3+     # UI Library
TypeScript     v5.3+      # Type safety
Vite           v5.1+      # Build tool
TailwindCSS    v3.4+      # Styling
shadcn/ui      Latest     # Component library
TanStack Query v5.28+     # Data fetching
Zustand        v4.5+      # State management
React Router   v6.22+     # Routing
```

### Processamento & IA
```
yt-dlp         Latest     # Download de vídeos
FFmpeg         v6.0+      # Processamento de vídeo/áudio
Whisper        Latest     # Transcrição (OpenAI)
Google Gemini  v2.0       # Análise de highlights + Ranqueamento
```

### DevOps
```
Git            Latest     # Controle de versão
Python         v3.10+     # Backend runtime
Node.js        v18+       # Frontend runtime
```

---

## 📊 Modelo de Dados Completo

### Entidades Principais

**Channel** (Canal do YouTube)
```
- id
- channel_id (YouTube)
- name
- thumbnail_url
- subscriber_count
- created_at
```

**Video**
```
- id
- channel_id (FK)
- youtube_id
- url
- title
- description
- thumbnail_url
- duration_seconds
- view_count
- like_count
- comment_count
- status (enum: ver abaixo)
- created_at
- updated_at
```

**Transcript** (Transcrição)
```
- id
- video_id (FK)
- content (texto completo)
- format (srt, vtt, json)
- language
- revised (boolean - se foi revisada manualmente)
- created_at
```

**Highlight** (Corte identificado)
```
- id
- video_id (FK)
- start_time_seconds
- end_time_seconds
- duration_seconds
- transcript_excerpt
- ai_analysis (JSON com scores da 1ª análise)
- ai_ranking (score da 2ª análise)
- status (enum: ver abaixo)
- created_at
- updated_at
```

**Subtitle** (Legenda de um highlight)
```
- id
- highlight_id (FK)
- content (arquivo SRT/VTT)
- style (JSON com configurações)
- revised (boolean)
- created_at
```

---

## 📋 Status e Estados do Sistema

### Video.status
```
- metadata_pending    # URL colada, aguardando fetch de metadata
- metadata_fetched    # Metadata disponível para review
- downloading         # Download em progresso
- download_completed  # Download concluído, pronto para transcrição
- transcribing        # Transcrição em progresso
- transcribed         # Transcrição concluída, aguardando review
- analyzing           # IA analisando highlights
- highlights_pending  # Highlights gerados, aguardando review
- cutting             # Cortes sendo gerados
- highlights_ready    # Highlights cortados, prontos para ranking
- ranking             # IA ranqueando highlights
- ranked              # Ranking concluído
- subtitling          # Legendas sendo geradas
- completed           # Tudo pronto
- failed              # Erro em alguma etapa
```

### Highlight.status
```
- pending             # Aguardando análise
- analyzed            # Analisado pela IA (1ª etapa)
- approved            # Aprovado para corte
- rejected            # Rejeitado pelo usuário
- cutting             # Sendo cortado
- cut_completed       # Corte finalizado
- ranked              # Ranqueado pela IA (2ª etapa)
- subtitling          # Legendas sendo aplicadas
- ready               # Pronto para uso/publicação
```

---

## 🔄 Fluxo Completo do Sistema

### **FASE 1: Adicionar Vídeo + Fetch Metadata**
```
1. Usuário cola URL do YouTube
2. Frontend valida formato
3. Backend extrai youtube_id
4. Backend busca metadata (API ou yt-dlp)
5. Verifica se canal existe, senão cria
6. Salva Video (status: metadata_fetched)
7. Exibe página de REVIEW de metadata
   - Thumbnail
   - Título (editável)
   - Descrição (editável)
   - Canal, views, likes, comentários
   - Botão: "Confirmar e Baixar"
```

### **FASE 2: Download do Vídeo**
```
1. Usuário clica "Confirmar e Baixar"
2. status → downloading
3. Backend baixa com yt-dlp (1080p)
4. Salva arquivo em storage/videos/{id}/
5. status → download_completed
6. Redireciona para página do vídeo
7. Exibe botão: "Iniciar Transcrição"
```

### **FASE 3: Transcrição + Review**
```
1. Usuário clica "Iniciar Transcrição"
2. status → transcribing
3. Backend extrai áudio (FFmpeg)
4. Whisper transcreve
5. Salva Transcript no banco
6. status → transcribed
7. Exibe página de REVIEW da transcrição
   - Texto completo editável
   - Timestamps
   - Player de vídeo sincronizado
   - Botão: "Confirmar Transcrição"
```

### **FASE 4: Análise de Highlights + Review**
```
1. Usuário clica "Confirmar Transcrição"
2. status → analyzing
3. Backend envia transcrição para Gemini
4. Prompt: "Identifique TODOS os momentos com potencial"
5. Gemini retorna N highlights com:
   - start_time, end_time, duration
   - transcript_excerpt
   - scores: impacto, emoção, clareza, viralidade
   - reasoning (por que esse trecho)
6. Salva todos os Highlights (status: analyzed)
7. status → highlights_pending
8. Exibe página de REVIEW dos highlights
   - Lista de todos os highlights
   - Preview de cada trecho (player)
   - Scores visualizados
   - Sliders para ajustar início/fim
   - Botões: Aprovar / Rejeitar / Ajustar
   - Opção de adicionar highlight manual
```

### **FASE 5: Corte dos Highlights Aprovados**
```
1. Usuário aprova highlights desejados
2. status → cutting
3. Backend corta cada highlight aprovado (FFmpeg)
4. Salva clips em storage/clips/{highlight_id}/
5. Atualiza Highlight (status: cut_completed)
6. Quando todos cortados: status → highlights_ready
7. Exibe botão: "Ranquear Highlights"
```

### **FASE 6: Ranqueamento com IA + Review**
```
1. Usuário clica "Ranquear Highlights"
2. status → ranking
3. Backend envia highlights para Gemini (2ª análise)
4. Prompt: "Ranqueie por potencial de ROI/viralidade"
5. Gemini retorna ranking_score para cada
6. Atualiza campo ai_ranking em cada Highlight
7. status → ranked
8. Exibe página de REVIEW do ranking
   - Highlights ordenados por score
   - Possibilidade de reordenar manualmente
   - Botão: "Confirmar Ranking"
```

### **FASE 7: Legendagem + Review**
```
1. Usuário clica "Confirmar Ranking"
2. status → subtitling
3. Para cada highlight aprovado:
   - Gera legenda automaticamente (usando transcript)
   - Aplica com FFmpeg (hardcoded ou burned)
4. Salva Subtitle no banco
5. status → completed
6. Exibe página de REVIEW de legendas
   - Preview de cada highlight com legenda
   - Editor de legenda (texto, timing, estilo)
   - Botão: "Finalizar" → status: ready
```

---

## 🎯 Escopo MVP (O que ESTÁ incluído)

**✅ Funcionalidades Core:**
- Adicionar vídeo via URL (YouTube)
- Fetch e review de metadata antes de salvar
- Download de vídeo
- Transcrição com Whisper + review manual
- Análise de highlights com Gemini + review manual
- Corte de highlights com FFmpeg
- Ranqueamento de highlights com Gemini + review manual
- Legendagem de highlights + review manual
- Navegação contextual baseada em status
- CRUD de canais (básico)

**✅ Tecnologias:**
- Backend: FastAPI + SQLAlchemy + SQLite
- Frontend: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- IA: Gemini 2.0 + Whisper
- Processamento: yt-dlp + FFmpeg

---

## ❌ Fora do Escopo (NÃO incluído no MVP)

**Features Futuras:**
- ❌ Monitoramento automático de canais
- ❌ Publicação automática em plataformas
- ❌ Analytics de performance
- ❌ Sistema de templates de legendas
- ❌ Editor de vídeo avançado
- ❌ Suporte a múltiplos usuários
- ❌ Automação completa (sempre manual)
- ❌ Processamento em batch
- ❌ Notificações push
- ❌ Integração com redes sociais

**Plataformas:**
- ❌ Outros sites além do YouTube (por enquanto)
- ❌ Upload direto de arquivos (só URL)

---

## 🎨 Princípios de UX

### 1. Controle Total
- Usuário **sempre** revisa antes de avançar
- Nada acontece sem confirmação explícita

### 2. Transparência
- Status **sempre** visível
- Progresso em tempo real
- Erros claros e acionáveis

### 3. Navegação Inteligente
- Ao acessar vídeo → redireciona para página do status atual
- Breadcrumbs mostram progresso
- Não permite pular etapas

### 4. Flexibilidade
- Ajustes manuais em todas as etapas
- Possibilidade de voltar e refazer
- Salvar progresso a qualquer momento

---

## 📝 Próximos Passos

1. ✅ **Definir contexto e fluxo completo** ← FEITO
2. 📝 **Documentar Fase 0: Setup & Estrutura**
3. 📝 **Documentar Fase 1: URL → Metadata → Review**
4. 📝 **Documentar Fase 2: Download**
5. 📝 **Documentar Fase 3: Transcrição → Review**
6. 📝 **Documentar Fase 4: Análise Highlights → Review**
7. 📝 **Documentar Fase 5: Corte**
8. 📝 **Documentar Fase 6: Ranqueamento → Review**
9. 📝 **Documentar Fase 7: Legendagem → Review**
10. 🚀 **Começar desenvolvimento**

---

**Documento vivo** - Atualizar conforme necessário
