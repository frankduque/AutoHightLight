# 📋 FASE 3: Transcrição → Review

**Duração:** 3 dias  
**Objetivo:** Transcrever áudio do vídeo usando Whisper e permitir revisão/edição manual

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Usuário acessa vídeo (status: `download_completed`)
2. Clica "Iniciar Transcrição"
3. Backend extrai áudio do vídeo (FFmpeg)
4. Whisper transcreve áudio (pode demorar)
5. Sistema salva transcrição no banco
6. Status muda para `transcribed`
7. Frontend exibe tela de review da transcrição
8. Usuário pode editar texto, corrigir erros
9. Player de vídeo sincronizado com timestamps
10. Clica "Confirmar Transcrição" para prosseguir

### Status do Vídeo
- Antes: `download_completed`
- Durante: `transcribing`
- Depois: `transcribed`

---

## 🐍 Backend - Checklist

### Endpoints
- [ ] **POST /api/videos/{id}/transcribe**
  - Verifica status válido
  - Atualiza status para `transcribing`
  - Extrai áudio com FFmpeg (16kHz WAV)
  - Transcreve com Whisper (modelo configurável)
  - Salva Transcript no banco
  - Atualiza status para `transcribed`
  - Error handling: áudio corrompido, Whisper falha

- [ ] **GET /api/videos/{id}/transcript**
  - Retorna transcrição completa
  - Formato: JSON com timestamps ou texto completo

- [ ] **PUT /api/transcripts/{id}**
  - Recebe texto editado pelo usuário
  - Atualiza campo `content`
  - Marca `revised = true`

### Services
- [ ] **AudioTranscriber**
  - Extrai áudio: `ffmpeg -i video.mp4 -ar 16000 audio.wav`
  - Transcreve com Whisper: `whisper.load_model("base").transcribe()`
  - Gera output em formato SRT (com timestamps)
  - Salva arquivo em `storage/videos/{id}/transcript.srt`

### Models
- [ ] Transcript model já existe (Fase 0)
- [ ] Campos: content, format, language, revised

---

## ⚛️ Frontend - Checklist

### Páginas
- [ ] **TranscriptReviewPage** (/videos/{id}/transcript)
  - Player de vídeo no topo
  - Editor de transcrição embaixo
  - Timestamps clicáveis (seek no vídeo)
  - Botão "Salvar Alterações" (auto-save opcional)
  - Botão "Confirmar e Prosseguir"

### Componentes
- [ ] **VideoPlayer**
  - Player HTML5 ou library (react-player)
  - Controles: play/pause, seek, volume
  - Sincronização com timestamps

- [ ] **TranscriptEditor**
  - Textarea com texto completo
  - Syntax highlight para timestamps (opcional)
  - Auto-save com debounce (3 segundos)
  - Indicador de "salvando..."

### Lógica
- [ ] Carregar transcrição ao montar componente
- [ ] Clicar timestamp → seek vídeo para aquele momento
- [ ] Editar texto → auto-save após 3s sem digitar
- [ ] Confirmar → chama API e vai para próxima fase

---

## 🧪 Testes

### Backend
- [ ] **Teste: Transcrição completa**
  - Input: Video com áudio válido
  - Expected: Transcript criado, status atualizado

- [ ] **Teste: Atualizar transcrição**
  - Input: Texto editado
  - Expected: Content atualizado, revised = true

- [ ] **Teste: Extração de áudio**
  - FFmpeg gera arquivo WAV correto
  - Áudio tem 16kHz (formato esperado)

- [ ] **Teste: Whisper transcrição**
  - Whisper retorna texto com timestamps
  - Formato SRT válido

### Frontend
- [ ] **Teste: Edição de transcrição**
  - Digitar texto → auto-save funciona
  - Indicador de "salvando" aparece

- [ ] **Teste: Sincronização de timestamp**
  - Clicar timestamp → vídeo pula para momento correto

- [ ] **Teste: Fluxo completo**
  - Transcrever → Editar → Salvar → Confirmar → Próxima fase

### Integração
- [ ] **Teste: Transcrição end-to-end**
  - Vídeo completo → Transcrição gerada → Editável → Salva

---

## ✅ Critérios de Conclusão

1. ✅ Transcrição é gerada automaticamente
2. ✅ Texto é exibido de forma editável
3. ✅ Player sincroniza com timestamps
4. ✅ Auto-save funciona
5. ✅ Mudanças são persistidas
6. ✅ Status atualiza corretamente
7. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **FASE 4: Análise de Highlights → Review**

---

**Notas de Implementação:**
- Whisper modelo "base" é bom equilíbrio (velocidade x qualidade)
- GPU acelera muito (opcional)
- Transcrição pode demorar (1h vídeo ≈ 5-10min)
- Auto-save evita perda de edições
- Formato SRT facilita sincronização
