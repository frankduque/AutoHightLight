# 🏆 FASE 5: Classificação, Ranqueamento e Análise de Profitability com IA Feedback Loop

**Duração:** 5 dias  
**Objetivo:** Realimentar a IA com os highlights analisados na Fase 4 para classificá-los, ranqueá-los e prever quais têm maior potencial de retorno financeiro, com análise de profitability considerando regras de monetização

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Usuário acessa vídeo (status: `analyzed`)
2. Clica "Classificar e Rankear Highlights"
3. Backend realimenta IA com:
   - Lista de highlights com todos os 6 indicadores
   - Transcrição completa para contexto
   - Metadados do vídeo (duração, plataforma, nicho)
4. IA executa análise de segunda camada:
   - **Classifica** highlights em categorias (Best, Good, Average, Skip)
   - **Rankeia** highlights por ordem de qualidade geral
   - **Calcula Profitability Score** (0-10): potencial de retorno financeiro
   - Fornece **justificativas** para cada classificação
5. Sistema atualiza registros de Highlights com nova camada de dados
6. Status muda para `ranked`
7. Frontend exibe dashboard de ranqueamento:
   - Top 5 highlights recomendados (profitability > 7)
   - Highlights classificados por categoria
   - Gráficos comparativos de profitability vs indicadores
   - Recomendações de quais highlights produzir primeiro
8. Usuário pode revisar, override de classificações
9. Clica "Confirmar Seleção" para prosseguir à geração

### Status do Vídeo
- Antes: `analyzed`
- Durante: `ranking`
- Depois: `ranked`

---

## 🐍 Backend - Checklist

### Endpoints
- [ ] **POST /api/videos/{id}/rank**
  - Verifica status válido (`analyzed`)
  - Atualiza status para `ranking`
  - Carrega todos os highlights com indicadores
  - Carrega transcrição e metadados para contexto
  - Envia para IA com prompt de ranqueamento (segunda camada)
  - Parse da resposta JSON da IA
  - Valida classificações e profitability scores
  - Atualiza todos os highlights com novos dados
  - Atualiza status para `ranked`
  - Error handling: IA falha, resposta inconsistente

- [ ] **GET /api/videos/{id}/ranked-highlights**
  - Retorna highlights ordenados por rank
  - Inclui: rank_position, classification, profitability_score, justification
  - Agrupados por categoria (Best, Good, Average, Skip)
  - Cálculo de métricas agregadas (média profitability, distribuição)

- [ ] **PUT /api/highlights/{id}/classification**
  - Permite override manual da classificação
  - Atualiza: classification, profitability_score (usuário pode ajustar)
  - Marca como `user_overridden = true`
  - Recalcula ranking geral

- [ ] **GET /api/videos/{id}/ranking-stats**
  - Estatísticas do ranqueamento:
    - Total de highlights por categoria
    - Média de profitability por categoria
    - Tempo estimado de produção (baseado em highlights selecionados)
    - ROI estimado (engajamento previsto vs esforço)

### Services
- [ ] **HighlightRanker**
  - Prepara dados estruturados para IA:
    ```json
    {
      "video_context": {...},
      "highlights": [
        {
          "id": 1,
          "timestamp": "00:01:23 - 00:01:45",
          "description": "...",
          "indicators": {
            "emotion": 7.5,
            "virality": 6.0,
            "action": 8.5,
            "humor": 2.0,
            "clutch": 9.0,
            "quality": 7.0
          },
          "aggregate_score": 7.2
        }
      ]
    }
    ```
  - Envia para IA (modelo GPT-4 recomendado)
  - Parse resposta com classificações e rankings
  - Valida profitability scores (0-10)
  - Ordena highlights por rank_position

- [ ] **ProfitabilityAnalyzer**
  - Algoritmo auxiliar para calcular ROI estimado com regras de monetização:
    ```python
    def estimate_roi(highlight):
        # Fatores de engajamento
        engagement_factor = (
            highlight.virality_score * 0.4 +
            highlight.emotion_score * 0.3 +
            highlight.quality_score * 0.3
        )
        
        # Fatores de produção (custo/tempo)
        duration = highlight.end_time - highlight.start_time
        production_cost = calculate_production_effort(duration)
        
        # NOVO: Compliance de monetização
        monetization_multiplier = calculate_monetization_compliance(duration)
        
        # ROI = (Engajamento Esperado / Esforço) * Compliance
        roi = (engagement_factor / production_cost) * monetization_multiplier
        return roi
    
    def calculate_monetization_compliance(duration_seconds):
        """Calcula multiplicador baseado em regras de monetização"""
        if duration_seconds < 15:
            return 0.4  # Penalidade severa: não monetizável como Short
        elif 15 <= duration_seconds < 30:
            return 0.9  # Penalidade leve: monetizável mas curto demais
        elif 30 <= duration_seconds <= 60:
            return 1.1  # BONUS: duração ideal para Shorts
        elif 60 < duration_seconds <= 90:
            return 0.95  # Leve penalidade: só Instagram Reels
        else:  # > 90s
            return 0.5  # Penalidade severa: não é Short
    
    def validate_monetization_requirements(highlight):
        """Valida se highlight atende requisitos de monetização"""
        duration = highlight.end_time - highlight.start_time
        
        requirements = {
            "youtube_shorts": 15 <= duration <= 60,
            "tiktok": 1 <= duration <= 180,  # mais flexível
            "instagram_reels": 15 <= duration <= 90,
            "ideal_duration": 30 <= duration <= 60
        }
        
        # Avalia nível de transformação necessária
        if highlight.quality_score < 6:
            requirements["transformation_needed"] = "high"
        elif highlight.quality_score < 8:
            requirements["transformation_needed"] = "medium"
        else:
            requirements["transformation_needed"] = "low"
        
        return requirements
    ```

- [ ] **PromptBuilder** - Prompt de Ranqueamento
  - Ver seção completa abaixo ⬇️

### Models
- [ ] Highlight model - **ADICIONAR campos de ranqueamento**:
  - Campos existentes (video_id, timestamps, indicadores...)
  - **classification** (Enum: 'best', 'good', 'average', 'skip'): categoria do highlight
  - **rank_position** (Integer): posição no ranking geral (1 = melhor)
  - **profitability_score** (Float 0-10): potencial de retorno financeiro
  - **ai_justification** (Text): explicação da IA para a classificação
  - **user_overridden** (Boolean): se usuário modificou a classificação
  - **estimated_views** (Integer): previsão de views do clipe
  - **estimated_engagement** (Float): taxa de engajamento prevista (%)
  - **production_priority** (Integer): ordem de prioridade de produção
  - **monetizable_youtube_shorts** (Boolean): atende requisitos YouTube Shorts (15-60s)
  - **monetizable_tiktok** (Boolean): atende requisitos TikTok
  - **monetizable_instagram_reels** (Boolean): atende requisitos Instagram Reels (15-90s)
  - **duration_rating** (Enum: 'too_short', 'acceptable', 'ideal', 'too_long'): avaliação da duração
  - **transformation_needed** (Enum: 'low', 'medium', 'high'): nível de edição necessária
  - **monetization_penalty** (Float): fator de penalidade aplicado (0.0-1.0)

---

## 📝 Engenharia de Prompt - Ranqueamento e Profitability

```python
RANKING_PROMPT = """
Você é um analista sênior especializado em prever performance de clipes virais.
Sua tarefa é RANKEAR highlights previamente identificados e prever seu potencial de retorno financeiro.

CONTEXTO DO VÍDEO:
- Tipo: {video_type}
- Duração: {duration}
- Plataforma: {platform}
- Nicho: {niche}
- Público-alvo: {target_audience}

HIGHLIGHTS IDENTIFICADOS (com indicadores da Fase 4):
{highlights_json}

SUA TAREFA - ANÁLISE DE SEGUNDA CAMADA:

1. **CLASSIFICAR** cada highlight em uma categoria:
   - **BEST**: Highlights excepcionais, alto potencial viral e monetização
   - **GOOD**: Highlights sólidos, bom engajamento esperado
   - **AVERAGE**: Highlights aceitáveis, engajamento moderado
   - **SKIP**: Highlights que não valem o esforço de produção

2. **RANKEAR** highlights do melhor (#1) ao pior
   - Considere: combinação de indicadores, contexto do vídeo, tendências atuais
   - Highlights "BEST" devem estar no topo, "SKIP" no final

3. **CALCULAR PROFITABILITY SCORE** (0-10) para cada highlight:
   
   🔍 FATORES DE PROFITABILITY:
   
   **Potencial de Views** (peso 35%):
   - Virality score alto (8+) = mais compartilhamentos
   - Emotion score alto (7+) = mais retenção
   - Humor score alto (7+) = mais rewatch
   
   **Potencial de Engajamento** (peso 30%):
   - Comentários esperados (emotion + virality)
   - Likes/reações (emotion + humor + clutch)
   - Compartilhamentos (virality + clutch)
   
   **Custo de Produção** (peso 20%):
   - Duração do clipe (menor = mais eficiente)
   - Qualidade já presente (quality score alto = menos edição)
   - Complexidade (action alto pode precisar mais edição)
   
   **Monetização e Compliance** (peso crítico - pode ZERAR profitability):
   - ⚠️ YouTube Shorts: 15-60 segundos (ideal: 30-45s)
   - ⚠️ TikTok: mínimo 1 segundo, ideal 15-60s
   - ⚠️ Instagram Reels: 15-90 segundos (ideal: 30-60s)
   - ⚠️ Conteúdo original mínimo: não pode ser 100% re-upload
   - ⚠️ Sem violação de copyright (música, imagens)
   - ⚠️ CRÍTICO: Highlights fora das durações permitidas = profitability reduzido em 50%
   
   **Tendência e Timing** (peso 15%):
   - Momento está em alta no nicho?
   - Tipo de conteúdo é evergreen ou temporal?
   - Alinha com algoritmo das plataformas?

   ESCALA DE PROFITABILITY:
   - 9-10: PRODUZIR URGENTE - ROI excepcional, viral garantido
   - 7-8: ALTA PRIORIDADE - Bom retorno esperado, produzir em seguida
   - 5-6: PRIORIDADE MÉDIA - Retorno moderado, produzir se sobrar recursos
   - 3-4: BAIXA PRIORIDADE - Retorno questionável, avaliar necessidade
   - 0-2: NÃO PRODUZIR - ROI negativo, não vale o esforço

4. **JUSTIFICAR** cada classificação:
   - Explique POR QUE este highlight tem aquele profitability score
   - Cite indicadores específicos
   - Mencione pontos fortes e fracos
   - Sugira melhorias se aplicável

⚠️ IMPORTANTE - REALISMO FINANCEIRO:
- Seja REALISTA com profitability scores
- Nem todo highlight "bom" tem alto profitability (considere custo/benefício)
- Highlights com emotion/virality < 5 raramente têm profitability > 6
- Se aggregate_score < 6.0, profitability dificilmente passa de 5.0

🚨 REGRAS CRÍTICAS DE MONETIZAÇÃO (NÃO NEGOCIÁVEIS):

**Duração para Shorts Monetizáveis:**
- ✅ IDEAL: 30-60 segundos (todas as plataformas aceitam, algoritmo favorece)
- ⚠️ ACEITÁVEL: 15-30 segundos (monetizável, mas menos retenção)
- ⚠️ ACEITÁVEL: 60-90 segundos (apenas Instagram, não é Short no YouTube)
- ❌ EVITAR: < 15 segundos (não monetizável na maioria das plataformas)
- ❌ EVITAR: > 90 segundos (não é considerado Short, algoritmo penaliza)

**Impacto na Profitability por Duração:**
- < 15s: profitability máximo = 4.0 (não monetizável como Short)
- 15-30s: profitability normal (sem penalidade)
- 30-60s: profitability +10% bonus (duração ideal, maior retenção)
- 60-90s: profitability normal (apenas Instagram Reels)
- > 90s: profitability máximo = 5.0 (não é Short, menor alcance)

**Regras de Conteúdo Original (YouTube Partner Program):**
- Highlight deve ter TRANSFORMAÇÃO: edição, cortes, efeitos, narração
- Não pode ser apenas recorte direto do vídeo original
- Deve adicionar valor: texto, zoom, slow-motion, trilha sonora
- Penalidade: highlights sem transformação = profitability máximo 6.0

**Aplicação Prática:**
1. Se highlight tem 12 segundos: classificar como SKIP ou sugerir extensão
2. Se highlight tem 95 segundos: sugerir cortar para 60s ou alertar limitação
3. Se highlight é apenas recorte puro: reduzir profitability e sugerir edições
4. Priorizar highlights entre 30-60s com boa transformação possível

FORMATO DE RESPOSTA (JSON válido):
{
  "ranking_summary": {
    "total_highlights": 12,
    "best_count": 2,
    "good_count": 5,
    "average_count": 3,
    "skip_count": 2,
    "average_profitability": 5.8,
    "top_recommendation": "Produzir primeiro os highlights #1, #2 e #5"
  },
  "ranked_highlights": [
    {
      "highlight_id": 1,
      "rank_position": 1,
      "classification": "best",
      "profitability_score": 9.2,
      "estimated_views": 50000,
      "estimated_engagement": 8.5,
      "justification": "Combinação perfeita de clutch moment (9.0) + alta viralização (8.5). Momento decisivo com forte apelo emocional. Duração 22s = curto mas monetizável. Alto ROI garantido.",
      "strengths": ["Momento único", "Alta viralização", "Duração monetizável"],
      "weaknesses": ["Duração no limite mínimo (22s)", "Precisa contexto adicional"],
      "production_tips": "Adicionar 3-5s de intro/contexto para atingir 30s ideal. Slow-motion no momento chave. Música épica. Texto overlay explicando contexto.",
      "monetization_compliance": {
        "youtube_shorts": true,
        "tiktok": true,
        "instagram_reels": true,
        "duration_rating": "acceptable",
        "transformation_needed": "medium"
      }
    },
    {
      "highlight_id": 5,
      "rank_position": 2,
      "classification": "best",
      "profitability_score": 8.7,
      "estimated_views": 35000,
      "estimated_engagement": 7.8,
      "justification": "Humor extremo (9.5) + boa viralização (7.0). Momento engraçado com alto potencial de compartilhamento. Duração 38s = IDEAL para Shorts. Qualidade técnica boa (8.0) = pouca edição necessária. BONUS: duração perfeita aumenta profitability em 10%.",
      "strengths": ["Muito engraçado", "Compartilhável", "Duração ideal (38s)", "Qualidade boa"],
      "weaknesses": ["Depende de timing de comedia", "Precisa efeitos sonoros"],
      "production_tips": "Cortar exatamente no punchline. Adicionar efeito sonoro cômico. Zoom no momento da piada. Legendas para acessibilidade.",
      "monetization_compliance": {
        "youtube_shorts": true,
        "tiktok": true,
        "instagram_reels": true,
        "duration_rating": "ideal",
        "transformation_needed": "low"
      }
    }
  ]
}

VALIDAÇÃO:
- rank_position deve ser sequencial: 1, 2, 3...
- Todos os profitability_scores entre 0-10
- Classification deve ser: best, good, average ou skip
- Justification mínimo 50 caracteres, máximo 300
- estimated_views e estimated_engagement devem ser realistas

Responda APENAS com o JSON, sem texto adicional.
"""
```

---

## ⚛️ Frontend - Checklist

### Páginas
- [ ] **RankingDashboardPage** (/videos/{id}/ranking)
  - **Cards de resumo** no topo:
    - Total de highlights por categoria (pizza chart)
    - Profitability médio geral
    - Top 3 recomendações destacadas
    - Tempo estimado de produção total
  - **Lista ranqueada de highlights**:
    - Ordenação: rank_position (melhor primeiro)
    - Cores por categoria (Best=verde, Good=azul, Average=amarelo, Skip=cinza)
    - Badges de profitability
  - **Gráficos comparativos**:
    - Profitability vs Aggregate Score (scatter plot)
    - Distribuição de profitability (histograma)
  - Botões: "Ajustar Classificações", "Confirmar e Gerar Clipes"

### Componentes
- [ ] **RankingSummaryCard**
  - Estatísticas gerais do ranqueamento
  - Gráfico pizza: distribuição por categoria
  - Lista de top 3 com thumbnails
  - Badge de "ROI Total Estimado"

- [ ] **RankedHighlightCard**
  - **Rank badge** grande (#1, #2, etc)
  - **Classification badge** colorido (BEST, GOOD, etc)
  - Thumbnail do highlight
  - **Timestamps e duração** com indicador visual:
    - ✅ Verde: 30-60s (duração ideal)
    - ⚠️ Amarelo: 15-30s ou 60-90s (aceitável)
    - ❌ Vermelho: < 15s ou > 90s (não monetizável ou limitado)
  - **Profitability score** destacado (número + barra progress)
  - **Badges de monetização**: 
    - ✅/❌ YouTube Shorts
    - ✅/❌ TikTok
    - ✅/❌ Instagram Reels
  - **Indicadores originais** (6 badges pequenos)
  - **Justificação da IA** (texto expansível)
  - **Strengths e Weaknesses** (listas)
  - **Production tips** da IA
  - **Alerta de compliance** se duração problemática
  - Botão "Reprovar" (mover para SKIP)
  - Botão "Promover" (subir categoria)
  - Botão "Preview"

- [ ] **ClassificationEditor**
  - Modal para editar classificação manual
  - Dropdown: categoria (Best/Good/Average/Skip)
  - Slider: profitability score (0-10)
  - Textarea: justificativa customizada
  - Preview de impacto no ranking geral

- [ ] **ComparativeCharts**
  - **Scatter plot**: Profitability vs Aggregate Score
    - Eixo X: aggregate_score (0-10)
    - Eixo Y: profitability_score (0-10)
    - Pontos coloridos por categoria
    - Identifica outliers (alto aggregate mas baixo profit)
  - **Histograma**: Distribuição de profitability
  - **Radar comparativo**: Top 5 highlights sobrepostos

### Lógica
- [ ] Carregar highlights ranqueados ao montar
- [ ] **Auto-scroll para Top 3** (destaque inicial)
- [ ] Click em highlight → preview no player
- [ ] **Filtrar por categoria** (show only BEST, etc)
- [ ] **Re-ordenar**: permitir arrastar para mudar rank manual
- [ ] Promover/Reprovar → recalcula ranks
- [ ] Editar profitability → atualiza gráficos em tempo real
- [ ] **Seleção múltipla**: selecionar highlights para produzir
- [ ] Estimativa de tempo total (sum de durações selecionadas)
- [ ] Export PDF: relatório de ranqueamento para aprovação

---

## 🧪 Testes

### Backend
- [ ] **Teste: Ranqueamento completo**
  - Input: 10 highlights analisados
  - Expected: Todos ranqueados, classificados, com profitability

- [ ] **Teste: Validação de consistência**
  - Input: Resposta da IA com rank duplicado
  - Expected: Sistema detecta e corrige ou rejeita

- [ ] **Teste: Profitability realista**
  - Input: Highlight com aggregate < 5.0
  - Expected: Profitability não deve ser > 6.0

- [ ] **Teste: Regras de monetização - duração curta**
  - Input: Highlight com 12 segundos (< 15s)
  - Expected: Profitability máximo 4.0, classificação não pode ser BEST

- [ ] **Teste: Regras de monetização - duração longa**
  - Input: Highlight com 95 segundos (> 90s)
  - Expected: Profitability máximo 5.0, alerta de não ser Short

- [ ] **Teste: Duração ideal bonus**
  - Input: Highlight com 45 segundos (duração ideal)
  - Expected: Profitability recebe bonus de 10%

- [ ] **Teste: Compliance de plataformas**
  - Input: Highlight com 70 segundos
  - Expected: monetizable_youtube_shorts = false, instagram_reels = true

- [ ] **Teste: Override manual**
  - Input: Usuário muda highlight de GOOD para BEST
  - Expected: Rank recalculado, user_overridden = true

- [ ] **Teste: Estatísticas agregadas**
  - Input: 15 highlights ranqueados
  - Expected: Contagem por categoria correta, médias calculadas

### Frontend
- [ ] **Teste: Visualização de ranking**
  - Highlights aparecem em ordem de rank
  - Cores corretas por categoria
  - Badges de profitability funcionam

- [ ] **Teste: Gráficos**
  - Scatter plot renderiza todos os pontos
  - Hover mostra detalhes do highlight
  - Histograma reflete distribuição real

- [ ] **Teste: Edição de classificação**
  - Mudar categoria → rank atualiza
  - Ajustar profitability → gráfico atualiza
  - Salvar → persiste no backend

- [ ] **Teste: Filtros e ordenação**
  - Filtrar por BEST → mostra apenas best
  - Re-ordenar manualmente → ranks atualizam

### Integração
- [ ] **Teste: Fluxo completo Fase 4 → Fase 5**
  - Analisar (Fase 4) → Rankear (Fase 5) → Tudo consistente

- [ ] **Teste: Performance com muitos highlights**
  - 50+ highlights → dashboard responsivo
  - Gráficos renderizam em < 2s

---

## ✅ Critérios de Conclusão

1. ✅ IA classifica e rankeia highlights com justificativas
2. ✅ Profitability score é calculado realisticamente
3. ✅ Dashboard exibe ranking visualmente
4. ✅ Gráficos comparativos funcionam
5. ✅ Top 3 recomendações são destacadas
6. ✅ Usuário pode editar classificações manualmente
7. ✅ Estatísticas agregadas são precisas
8. ✅ Filtros e ordenação funcionam
9. ✅ Export de relatório funciona
10. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **FASE 6: Geração de Clipes → Export**

---

**Notas de Implementação:**
- **IA de segunda camada** permite análise mais sofisticada e contextual
- Profitability considera **ROI** (retorno vs esforço), não apenas qualidade
- **CRÍTICO: Regras de monetização são HARD CONSTRAINTS**, não sugestões
- Duração de 30-60s é prioridade máxima: otimiza para todas as plataformas
- Highlights < 15s ou > 90s devem ser automaticamente penalizados no profitability
- **Validação cruzada**: profitability não pode estar muito descorrelacionado dos indicadores
- Temperatura 0.3-0.4: mantém consistência mas permite criatividade na análise
- **Caching**: salvar resposta da IA para evitar recálculos desnecessários
- **A/B testing futuro**: comparar previsões vs performance real dos clipes
- **Machine Learning futuro**: treinar modelo próprio baseado em dados históricos
- Considerar adicionar fatores externos: tendências do Twitter, sazonalidade, etc
- Dashboard deve ser **acionável**: usuário decide o que produzir baseado nos dados
- Profitability score pode ser calibrado com dados reais ao longo do tempo
- **Sistema deve ALERTAR** quando highlight tem boa qualidade mas duração problemática
- Sugerir ajustes: adicionar intro/outro para highlights curtos, cortar highlights longos
- Documentar regras de cada plataforma (YouTube, TikTok, Instagram) para referência
