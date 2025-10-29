# 🎬 FASE 4: Análise de Highlights com Indicadores e Validação de Monetização → Review

**Duração:** 6 dias  
**Objetivo:** Analisar transcrição com IA usando engenharia de prompt avançada, identificar momentos de destaque com múltiplos indicadores quantitativos, validar compliance de monetização e permitir revisão/ajuste manual

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Usuário acessa vídeo (status: `transcribed`)
2. Clica "Analisar Highlights"
3. Backend envia transcrição para IA com prompt estruturado
4. IA analisa e retorna highlights com **indicadores quantitativos**:
   - 🔥 **Emoção** (0-10): Intensidade emocional do momento
   - 🚀 **Viralização** (0-10): Potencial de compartilhamento/reação
   - ⚡ **Ação** (0-10): Nível de ação/intensidade/epicness
   - 😂 **Humor** (0-10): Valor cômico/engraçado
   - 🎯 **Clutch** (0-10): Momento decisivo/virada de jogo
   - 💎 **Qualidade** (0-10): Qualidade técnica/cinematográfica
5. Sistema valida durações contra regras de monetização
6. Sistema sugere ajustes de timestamps para highlights fora da duração ideal
7. Sistema cria registros de Highlights com todos os indicadores
6. Status muda para `analyzed`
7. Frontend exibe timeline com highlights e gráficos de indicadores
8. **Alertas visuais** para highlights com duração não-ideal para monetização
9. **Sugestões automáticas** de ajuste de timestamps (adicionar/remover segundos)
10. Usuário pode ajustar timestamps, indicadores, adicionar/remover
11. **Botão "Otimizar Duração"** para ajustar automaticamente para 30-60s
12. Player mostra preview com badges de indicadores e duração
13. Clica "Confirmar Highlights" para prosseguir à classificação (Fase 5)

### Status do Vídeo
- Antes: `transcribed`
- Durante: `analyzing`
- Depois: `analyzed`

---

## 🐍 Backend - Checklist

### Endpoints
- [ ] **POST /api/videos/{id}/analyze**
  - Verifica status válido (`transcribed`)
  - Atualiza status para `analyzing`
  - Carrega transcrição completa + metadados do vídeo
  - Envia para IA com prompt estruturado (ver seção Engenharia de Prompt)
  - Parse da resposta JSON da IA com validação rigorosa
  - **Valida indicadores**: todos devem estar entre 0-10
  - **Detecta inflação**: se médias > 8, rejeita e pede recalibração
  - **Valida durações**: calcula duração de cada highlight
  - **Gera sugestões de ajuste**: se duração < 15s ou > 90s
  - Cria múltiplos Highlights no banco com todos os indicadores
  - Atualiza status para `analyzed`
  - Error handling: IA timeout, resposta inválida, quota excedida, indicadores inflados

- [ ] **GET /api/videos/{id}/highlights**
  - Retorna lista de highlights ordenados por timestamp
  - Inclui: start_time, end_time, description, todos os indicadores
  - Cálculo de score agregado: média ponderada dos indicadores
  - Paginação opcional (muitos highlights)
  - Filtros: por indicador mínimo (ex: emotion > 7)

- [ ] **PUT /api/highlights/{id}**
  - Atualiza timestamps (start_time, end_time)
  - Atualiza description
  - **Atualiza indicadores individuais** (usuário pode ajustar)
  - Marca como revisado pelo usuário
  - Recalcula score agregado

- [ ] **POST /api/videos/{id}/highlights**
  - Permite adicionar highlight manual
  - Input: start_time, end_time, description

- [ ] **DELETE /api/highlights/{id}**
  - Remove highlight indesejado
  - Soft delete (marca como deleted)

- [ ] **POST /api/highlights/{id}/optimize-duration**
  - Recebe highlight com duração não-ideal
  - Calcula ajustes necessários para atingir 30-60s
  - Retorna sugestões: adicionar X segundos antes/depois
  - Opcionalmente aplica ajuste automático

### Services
- [ ] **HighlightAnalyzer**
  - Prepara prompt para IA com transcrição
  - Configura parâmetros: modelo (GPT-4), temperatura (0.3 - baixa para consistência), tokens
  - Envia request para API (OpenAI/Anthropic)
  - Parse JSON response: extrai timestamps, descrições e **todos os indicadores**
  - Valida timestamps (dentro da duração do vídeo)
  - **Valida indicadores**: verifica range 0-10 e detecta inflação
  - Se inflado (média > 8.0), reprocessa com aviso de calibração
  - **Valida durações**: verifica compliance com regras de monetização
  - **Gera sugestões automáticas** de ajuste de timestamps
  - Calcula score agregado: (emotion * 0.2 + virality * 0.25 + action * 0.2 + humor * 0.15 + clutch * 0.1 + quality * 0.1)

- [ ] **DurationOptimizer**
  - Analisa highlights com duração problemática
  - Calcula ajustes necessários para regras de monetização:
    ```python
    def suggest_duration_adjustment(highlight):
        duration = highlight.end_time - highlight.start_time
        
        # Caso 1: Muito curto (< 15s) - adicionar tempo
        if duration < 15:
            needed = 15 - duration
            suggestion = {
                "issue": "too_short",
                "current_duration": duration,
                "target_duration": 30,  # alvo ideal
                "adjustment": {
                    "add_before": needed / 2,  # adiciona metade antes
                    "add_after": needed / 2,   # adiciona metade depois
                    "can_extend_before": check_available_time_before(highlight),
                    "can_extend_after": check_available_time_after(highlight)
                },
                "severity": "critical"  # não monetizável
            }
        
        # Caso 2: Curto (15-30s) - sugerir extensão para ideal
        elif 15 <= duration < 30:
            needed = 30 - duration
            suggestion = {
                "issue": "short",
                "current_duration": duration,
                "target_duration": 30,
                "adjustment": {
                    "add_before": needed / 2,
                    "add_after": needed / 2,
                    "can_extend_before": check_available_time_before(highlight),
                    "can_extend_after": check_available_time_after(highlight)
                },
                "severity": "warning"  # monetizável mas não ideal
            }
        
        # Caso 3: Ideal (30-60s) - nenhum ajuste necessário
        elif 30 <= duration <= 60:
            suggestion = {
                "issue": None,
                "current_duration": duration,
                "severity": "ok"
            }
        
        # Caso 4: Longo (60-90s) - sugerir corte para YouTube
        elif 60 < duration <= 90:
            excess = duration - 60
            suggestion = {
                "issue": "long",
                "current_duration": duration,
                "target_duration": 60,
                "adjustment": {
                    "trim_from_start": excess / 2,
                    "trim_from_end": excess / 2,
                    "can_trim": analyze_trimmable_sections(highlight)
                },
                "severity": "info"  # Instagram ok, YouTube não
            }
        
        # Caso 5: Muito longo (> 90s) - cortar obrigatório
        else:
            excess = duration - 60
            suggestion = {
                "issue": "too_long",
                "current_duration": duration,
                "target_duration": 45,  # alvo ideal médio
                "adjustment": {
                    "trim_from_start": excess / 2,
                    "trim_from_end": excess / 2,
                    "can_trim": analyze_trimmable_sections(highlight)
                },
                "severity": "critical"  # não é Short
            }
        
        return suggestion
    
    def apply_duration_optimization(highlight, adjustment):
        """Aplica ajuste automático nos timestamps"""
        if adjustment["issue"] == "too_short" or adjustment["issue"] == "short":
            # Adiciona tempo antes e depois
            new_start = max(0, highlight.start_time - adjustment["add_before"])
            new_end = min(video_duration, highlight.end_time + adjustment["add_after"])
        
        elif adjustment["issue"] == "long" or adjustment["issue"] == "too_long":
            # Remove tempo do início e fim
            new_start = highlight.start_time + adjustment["trim_from_start"]
            new_end = highlight.end_time - adjustment["trim_from_end"]
        
        return new_start, new_end
    ```

- [ ] **PromptBuilder** - Engenharia de Prompt Avançada
  - Template estruturado com instruções claras e exemplos
  - Contexto: tipo de conteúdo (gameplay, tutorial, etc)
  - **Instrução anti-inflação**: enfatiza uso realista da escala
  - Formato esperado: JSON estruturado com validação
  - Ver seção completa abaixo ⬇️

### Models
- [ ] Highlight model já existe (Fase 0) - **ATUALIZAR com novos campos**:
  - video_id, start_time, end_time, description
  - **emotion_score** (Float 0-10): intensidade emocional
  - **virality_score** (Float 0-10): potencial viral
  - **action_score** (Float 0-10): nível de ação
  - **humor_score** (Float 0-10): valor cômico
  - **clutch_score** (Float 0-10): momento decisivo
  - **quality_score** (Float 0-10): qualidade técnica
  - **aggregate_score** (Float 0-10): média ponderada calculada
  - **duration_seconds** (Float): duração calculada (end - start)
  - **duration_issue** (Enum: null, 'too_short', 'short', 'long', 'too_long'): problema de duração
  - **duration_severity** (Enum: 'ok', 'info', 'warning', 'critical'): severidade do problema
  - **suggested_start_adjustment** (Float): segundos para adicionar/remover do início
  - **suggested_end_adjustment** (Float): segundos para adicionar/remover do fim
  - user_edited, deleted
  
### 📝 Engenharia de Prompt - Seção Detalhada

```python
ANALYSIS_PROMPT = """
Você é um analista especializado em identificar momentos destacáveis em vídeos.
Sua tarefa é analisar a transcrição e identificar os melhores momentos para criar clipes curtos.

CONTEXTO DO VÍDEO:
- Tipo: {video_type}
- Duração: {duration}
- Plataforma de origem: {platform}

TRANSCRIÇÃO:
{transcript}

INSTRUÇÕES PARA ANÁLISE:

Identifique momentos de destaque (5-15 momentos) baseado nos seguintes critérios.
Para CADA momento, avalie 6 indicadores em uma escala de 0-10:

🔥 EMOÇÃO (0-10): Intensidade emocional do momento
   - 0-2: Neutro, sem emoção aparente
   - 3-5: Emoção moderada (surpresa leve, alegria simples)
   - 6-8: Emoção forte (raiva, euforia, frustração intensa)
   - 9-10: APENAS para momentos extremamente emocionais e raros (choro, grito de vitória épica)

🚀 VIRALIZAÇÃO (0-10): Potencial de compartilhamento e reação do público
   - 0-2: Conteúdo comum, baixo potencial de compartilhamento
   - 3-5: Interessante mas não notável
   - 6-8: Conteúdo compartilhável (momento engraçado, impressionante)
   - 9-10: APENAS para momentos com altíssimo potencial viral (absurdo, inesperado, meme-worthy)

⚡ AÇÃO (0-10): Nível de intensidade/ação/epicness
   - 0-2: Calmo, sem ação
   - 3-5: Ação moderada
   - 6-8: Ação intensa (combate, perseguição, momento épico)
   - 9-10: APENAS para ação extrema e rara (clutch impossível, 1v5, momento histórico)

😂 HUMOR (0-10): Valor cômico
   - 0-2: Não engraçado
   - 3-5: Levemente engraçado
   - 6-8: Muito engraçado (piada boa, situação cômica)
   - 9-10: APENAS para momentos hilariantemente engraçados

🎯 CLUTCH (0-10): Momento decisivo/virada de jogo
   - 0-2: Momento comum
   - 3-5: Momento importante
   - 6-8: Momento decisivo (virada, comeback)
   - 9-10: APENAS para momentos que definem o resultado final

💎 QUALIDADE (0-10): Qualidade técnica/cinematográfica do momento
   - 0-2: Baixa qualidade (confuso, mal executado)
   - 3-5: Qualidade adequada
   - 6-8: Boa qualidade (bem executado, claro)
   - 9-10: APENAS para momentos de excelência técnica

⚠️ IMPORTANTE - CALIBRAÇÃO DA ESCALA:
- Use a ESCALA COMPLETA de 0-10, não apenas valores altos
- A maioria dos momentos deve estar entre 4-7
- Notas 9-10 são RARAS e devem ser usadas com CRITÉRIO
- Se você está dando muitas notas acima de 8, RECALIBRE e seja mais crítico
- Um vídeo típico deve ter média geral entre 5-6, NÃO acima de 7
- Momentos medianos devem receber notas medianas (4-6)

FORMATO DE RESPOSTA (JSON válido):
[
  {
    "start": "00:01:23.500",
    "end": "00:01:45.800",
    "description": "Descrição concisa do momento (máx 100 caracteres)",
    "reason": "Explicação de por que este momento é destacável",
    "emotion": 7.5,
    "virality": 6.0,
    "action": 8.5,
    "humor": 2.0,
    "clutch": 9.0,
    "quality": 7.0
  }
]

CRITÉRIOS DE DURAÇÃO (para otimização de monetização):
- ✅ IDEAL: 30-60 segundos (melhor para monetização em todas as plataformas)
- ⚠️ ACEITÁVEL: 15-30 segundos (monetizável mas curto)
- ⚠️ ACEITÁVEL: 60-90 segundos (apenas Instagram Reels)
- ❌ EVITAR: < 15 segundos (difícil monetização)
- ❌ EVITAR: > 90 segundos (não é Short)

**IMPORTANTE**: Se você identificar um highlight bom mas com duração problemática:
- Highlights < 30s: PODE incluir, mas marque que precisa extensão
- Highlights > 60s: PODE incluir, mas marque que precisa corte
- Não descarte highlights bons só pela duração - o sistema ajustará depois

VALIDAÇÃO:
- Retorne entre 5-15 momentos
- Timestamps no formato HH:MM:SS.mmm
- start < end
- Todos os indicadores devem estar entre 0-10
- Description máximo 100 caracteres
- Reason máximo 200 caracteres
- Priorize highlights com duração 30-60s, mas não ignore outros

Responda APENAS com o JSON, sem texto adicional.
"""
```

### Validação e Otimização de Duração (Pós-Processamento)

```python
def post_process_highlights(highlights: List[Dict]) -> List[Dict]:
    """Valida e adiciona sugestões de ajuste de duração após análise da IA"""
    
    for highlight in highlights:
        # Calcula duração
        start = parse_timestamp(highlight['start'])
        end = parse_timestamp(highlight['end'])
        duration = end - start
        highlight['duration_seconds'] = duration
        
        # Analisa duração e gera sugestões
        duration_analysis = analyze_duration(duration)
        highlight['duration_issue'] = duration_analysis['issue']
        highlight['duration_severity'] = duration_analysis['severity']
        
        # Gera sugestões de ajuste se necessário
        if duration_analysis['issue']:
            optimizer = DurationOptimizer()
            suggestion = optimizer.suggest_duration_adjustment(highlight)
            
            highlight['duration_suggestion'] = {
                "message": get_duration_message(duration_analysis['issue'], duration),
                "target_duration": suggestion.get('target_duration'),
                "adjustments": suggestion.get('adjustment', {})
            }
    
    return highlights

def get_duration_message(issue: str, current_duration: float) -> str:
    """Gera mensagem amigável sobre problema de duração"""
    if issue == "too_short":
        return f"⚠️ CRÍTICO: Muito curto ({current_duration:.1f}s). Adicione ~{15 - current_duration:.1f}s para monetizar."
    elif issue == "short":
        return f"⚠️ Curto ({current_duration:.1f}s). Ideal seria 30-60s. Considere adicionar {30 - current_duration:.1f}s."
    elif issue == "long":
        return f"ℹ️ Longo ({current_duration:.1f}s). Funciona no Instagram, mas corte {current_duration - 60:.1f}s para YouTube Shorts."
    elif issue == "too_long":
        return f"⚠️ CRÍTICO: Muito longo ({current_duration:.1f}s). Não é Short. Corte para ~45-60s."
    else:
        return f"✅ Duração ideal ({current_duration:.1f}s) para todas as plataformas!"
```

### Validação Anti-Inflação

```python
def validate_indicators(highlights: List[Dict]) -> bool:
    """Valida se os indicadores não estão inflados"""
    all_scores = []
    
    for h in highlights:
        scores = [
            h['emotion'], h['virality'], h['action'],
            h['humor'], h['clutch'], h['quality']
        ]
        all_scores.extend(scores)
    
    avg = sum(all_scores) / len(all_scores)
    
    # Se média geral > 8.0, está inflado
    if avg > 8.0:
        return False
    
    # Se mais de 30% das notas são 9+, está inflado
    high_scores = [s for s in all_scores if s >= 9.0]
    if len(high_scores) / len(all_scores) > 0.3:
        return False
    
    return True

def recalibrate_request(original_response: str) -> str:
    """Pede para IA recalibrar se detectar inflação"""
    return f"""
    AVISO: Os indicadores fornecidos estão INFLADOS (média > 8.0).
    
    Por favor, RECALIBRE sua análise seguindo rigorosamente a escala:
    - Maioria dos momentos: 4-7
    - Notas 8+: apenas para momentos realmente excepcionais
    - Notas 9-10: RARÍSSIMAS
    
    Resposta anterior (INFLADA):
    {original_response}
    
    Forneça nova análise CALIBRADA corretamente.
    """
```

---

## ⚛️ Frontend - Checklist

### Páginas
- [ ] **HighlightsReviewPage** (/videos/{id}/highlights)
  - Timeline visual com highlights marcados
  - Lista de cards de highlights (scroll vertical)
  - Player de vídeo com preview
  - Botões: "Adicionar Highlight", "Confirmar e Gerar Clipes"

### Componentes
- [ ] **HighlightsTimeline**
  - Barra horizontal representando vídeo completo
  - Segmentos coloridos para cada highlight
  - Hover mostra preview/descrição
  - Click seleciona highlight e mostra no player
  - Drag para ajustar timestamps

- [ ] **HighlightCard**
  - Thumbnail do momento (frame do vídeo)
  - **Duração destacada** com código de cores:
    - ✅ Verde (30-60s): "Ideal para monetização"
    - ⚠️ Amarelo (15-30s ou 60-90s): "Ajuste recomendado"
    - ❌ Vermelho (< 15s ou > 90s): "Ajuste necessário"
  - **Alerta de duração** se problemática (box colorido com sugestão)
  - Timestamps editáveis (input fields) com validação em tempo real
  - **Botão "Otimizar Duração"** (ajuste automático para 30-60s)
  - **Controles de ajuste fino**:
    - ➖➕ Adicionar/remover 5s no início
    - ➖➕ Adicionar/remover 5s no fim
    - "Estender para 30s ideal" (botão rápido)
  - Descrição editável (textarea)
  - **Gráfico radar** com 6 indicadores (visual hexagonal)
  - **Sliders editáveis** para cada indicador (0-10)
  - **Score agregado** destacado (número grande + cor)
  - Botão "Preview" (play no player)
  - Botão "Remover" (delete)
  - Badges coloridos: 🔥 Emoção, 🚀 Viral, ⚡ Ação, etc

- [ ] **HighlightEditor**
  - Formulário para adicionar highlight manual
  - Inputs: start_time, end_time, description
  - Validação: end > start, dentro da duração
  - Preview antes de salvar

- [ ] **VideoPlayerWithMarkers**
  - Player com marcadores de highlights na timeline
  - Click em marcador → jump para aquele momento
  - Botão "Marcar Início" e "Marcar Fim" (criar highlight)

### Lógica
- [ ] Carregar highlights ao montar componente
- [ ] **Calcular duração** de cada highlight automaticamente
- [ ] **Mostrar alertas visuais** para highlights com duração problemática
- [ ] Click em highlight → preview no player
- [ ] Drag timeline → ajusta timestamps em tempo real + atualiza duração
- [ ] **Validação em tempo real**: ao editar timestamps, verifica duração
- [ ] **Botão "Otimizar Duração"**:
  - Aplica sugestão automática de ajuste
  - Atualiza timestamps para atingir 30-60s
  - Valida que não ultrapassa limites do vídeo
  - Mostra preview do ajuste antes de aplicar
- [ ] **Controles de ajuste fino**:
  - Botões ±5s para início/fim
  - Atualiza duração instantaneamente
  - Visual feedback de antes/depois
- [ ] **Ajustar sliders de indicadores** → recalcula score agregado
- [ ] **Filtrar por indicador**: mostrar apenas highlights com X > 7
- [ ] **Filtrar por duração**: mostrar apenas problemáticos ou ideais
- [ ] **Ordenar por**: timestamp, score agregado, indicador, ou duração
- [ ] Debounce para salvar alterações (2s)
- [ ] Adicionar highlight → valida duração + envia para API
- [ ] Remover highlight → confirmação antes de deletar
- [ ] **Gráficos de distribuição**: histograma de cada indicador + duração
- [ ] **Contador de compliance**: "X/Y highlights com duração ideal"

---

## 🧪 Testes

### Backend
- [ ] **Teste: Análise completa**
  - Input: Vídeo com transcrição válida
  - Expected: Highlights criados, status atualizado

- [ ] **Teste: Parse resposta IA**
  - Input: JSON mockado da IA
  - Expected: Highlights extraídos corretamente

- [ ] **Teste: Validação de timestamps**
  - Input: Highlight com timestamp inválido
  - Expected: Erro ou correção automática

- [ ] **Teste: CRUD de highlights**
  - Create: novo highlight manual
  - Read: lista highlights do vídeo
  - Update: edita timestamps/descrição
  - Delete: remove highlight

- [ ] **Teste: IA timeout/erro**
  - Input: API da IA não responde
  - Expected: Error handling adequado, retry lógica

- [ ] **Teste: Detecção de inflação**
  - Input: Resposta da IA com média > 8.0
  - Expected: Sistema detecta e solicita recalibração

- [ ] **Teste: Validação de indicadores**
  - Input: Indicador fora do range (ex: emotion = 12)
  - Expected: Rejeita e retorna erro

- [ ] **Teste: Score agregado**
  - Input: Highlight com indicadores conhecidos
  - Expected: Score calculado corretamente com ponderação

- [ ] **Teste: Validação de duração - muito curto**
  - Input: Highlight com 12s (< 15s)
  - Expected: duration_issue = "too_short", severity = "critical", sugestão de adicionar ~18s

- [ ] **Teste: Validação de duração - ideal**
  - Input: Highlight com 45s (30-60s)
  - Expected: duration_issue = null, severity = "ok", sem sugestões

- [ ] **Teste: Validação de duração - muito longo**
  - Input: Highlight com 95s (> 90s)
  - Expected: duration_issue = "too_long", severity = "critical", sugestão de cortar ~35s

- [ ] **Teste: Otimização automática - estender curto**
  - Input: Highlight de 20s, otimizar para ideal
  - Expected: Adiciona 10s (5s antes + 5s depois) → total 30s

- [ ] **Teste: Otimização automática - cortar longo**
  - Input: Highlight de 75s, otimizar para ideal
  - Expected: Remove 15s (7.5s início + 7.5s fim) → total 60s

- [ ] **Teste: Limite do vídeo**
  - Input: Highlight no final do vídeo, tentar adicionar 10s depois
  - Expected: Adiciona apenas até o fim do vídeo, ajusta antes se necessário

### Frontend
- [ ] **Teste: Timeline interativa**
  - Drag highlight → timestamps atualizam
  - Click marcador → player pula para posição

- [ ] **Teste: Edição de highlight**
  - Editar timestamps → auto-save funciona
  - Validação: end > start
  - **Editar timestamps** → duração recalcula + alerta atualiza
  - **Editar indicadores** → score agregado recalcula
  - Sliders limitam valores entre 0-10

- [ ] **Teste: Botão otimizar duração**
  - Click "Otimizar Duração" em highlight de 18s
  - Expected: Timestamps ajustados para ~30s, alerta desaparece

- [ ] **Teste: Controles de ajuste fino**
  - Click "+5s no fim" em highlight de 25s
  - Expected: end_time += 5, duração = 30s, alerta muda de warning para ok

- [ ] **Teste: Filtro por duração**
  - Filtrar "Apenas problemáticos"
  - Expected: Mostra apenas highlights com duration_severity != "ok"

- [ ] **Teste: Adicionar highlight manual**
  - Preencher form → highlight criado
  - Aparece na timeline e na lista

- [ ] **Teste: Remover highlight**
  - Click remover → confirmação aparece
  - Confirmar → highlight desaparece

### Integração
- [ ] **Teste: Fluxo end-to-end**
  - Analisar → Highlights gerados → Editar → Adicionar manual → Remover → Confirmar

- [ ] **Teste: Performance**
  - Vídeo com 50+ highlights → interface responsiva
  - Timeline renderiza suavemente

---

## ✅ Critérios de Conclusão

1. ✅ IA identifica highlights automaticamente com 6 indicadores
2. ✅ Sistema detecta e rejeita indicadores inflados
3. ✅ **Sistema valida durações** contra regras de monetização
4. ✅ **Alertas visuais** para highlights com duração problemática
5. ✅ **Sugestões automáticas** de ajuste de duração são geradas
6. ✅ Highlights são exibidos na timeline visual com cores
7. ✅ Gráficos radar mostram indicadores visualmente
8. ✅ Usuário pode ajustar timestamps, duração e indicadores
9. ✅ **Botão "Otimizar Duração"** funciona corretamente
10. ✅ **Controles de ajuste fino** (±5s) funcionam
11. ✅ Score agregado é calculado e exibido corretamente
12. ✅ Filtros e ordenação por indicadores e duração funcionam
13. ✅ Preview de highlights funciona
14. ✅ Adicionar/remover highlights funciona
15. ✅ Auto-save persiste alterações incluindo duração
16. ✅ Status atualiza corretamente
17. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **FASE 5: Classificação e Ranqueamento com IA → Profitability Analysis**

---

**Notas de Implementação:**
- IA pode retornar 5-15 highlights por vídeo (dependendo da duração)
- **Prompt engineering é CRÍTICO**: teste extensivamente com vídeos reais
- **Temperatura 0.3**: mantém consistência nas avaliações
- **Validação anti-inflação**: essencial para manter qualidade dos indicadores
- Score agregado usa ponderação: viralização (25%) tem maior peso
- **Validação de duração**: SEMPRE calcular e validar após IA retornar
- **Não descartar highlights** por duração problemática - permitir ajuste
- **Duração ideal 30-60s**: priorizar mas permitir flexibilidade
- **UX de ajuste**: tornar fácil e visual para usuário corrigir durações
- **Feedback em tempo real**: mostrar impacto de ajustes instantaneamente
- Timeline drag precisa ser responsivo (< 100ms feedback)
- Thumbnails podem ser gerados on-demand (FFmpeg frame extract)
- Considerar rate limit da API de IA (queue de análise, max 3 retries)
- Gráfico radar: usar biblioteca como Chart.js ou Recharts
- Persistir histórico de recalibrações para análise de qualidade da IA
- Logs detalhados: salvar resposta crua da IA para debugging
- **Salvar histórico de ajustes**: trackear quando usuário otimiza durações
- **Analytics**: medir % de highlights que precisam ajuste de duração
