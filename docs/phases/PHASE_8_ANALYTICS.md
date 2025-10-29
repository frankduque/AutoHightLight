# 📊 FASE 8: Analytics Avançado e Otimização

**Duração:** 5 dias  
**Objetivo:** Sistema completo de analytics, tracking de performance, insights de IA para otimização de conteúdo, A/B testing e recomendações baseadas em dados

---

## 🎯 O que deve funcionar

### Fluxo Completo
1. Sistema coleta dados de todas as publicações automaticamente
2. Integra com APIs de analytics das plataformas
3. Processa e armazena métricas em tempo real
4. Gera insights automáticos com IA
5. Identifica padrões de sucesso (horários, formatos, indicadores)
6. Dashboard completo com visualizações interativas
7. Recomendações para otimizar próximas publicações
8. Comparação de performance entre highlights/canais/países
9. Sistema de score e classificação de conteúdo
10. Export de relatórios customizados

### Métricas Coletadas
- **Engajamento**: views, likes, comentários, shares, saves
- **Retenção**: watch time, completion rate, average view duration
- **Crescimento**: novos seguidores, subscriber count
- **Conversão**: clicks, CTR, traffic sources
- **Comparativo**: performance vs média do canal, vs outros clipes

---

## 🐍 Backend - Checklist

### Endpoints

- [ ] **GET /api/analytics/overview**
  - Dashboard principal de analytics
  - Métricas agregadas: total views, total engagement, growth rate
  - Comparação com período anterior (week-over-week, month-over-month)
  - Filtros: por período, por plataforma, por canal, por país

- [ ] **GET /api/analytics/clips/{id}**
  - Analytics detalhado de um clipe específico
  - Todas as métricas por publicação (cada canal)
  - Performance comparativa (vs outros clipes)
  - Timeline de engajamento

- [ ] **GET /api/analytics/highlights/{id}**
  - Analytics do highlight original
  - Agregado de todas as publicações deste highlight
  - Correlação entre indicadores (Fase 4) e performance real
  - Validação da IA: profitability previsto vs real

- [ ] **GET /api/analytics/channels/{id}**
  - Performance do canal ao longo do tempo
  - Métricas: total posts, avg views, engagement rate, growth
  - Melhores horários de publicação
  - Top performing content types

- [ ] **GET /api/analytics/insights**
  - Insights gerados por IA
  - Padrões identificados (ex: "Posts às 18h têm 30% mais views")
  - Recomendações acionáveis
  - Alertas (ex: "Performance abaixo da média esta semana")

- [ ] **GET /api/analytics/compare**
  - Comparação entre múltiplos clipes/canais/períodos
  - Side-by-side de métricas
  - Identificação de outliers (muito sucesso ou muito fracasso)

- [ ] **POST /api/analytics/ab-test**
  - Cria experimento de A/B testing
  - Define variações (ex: título diferente, thumbnail diferente)
  - Distribui publicações entre variações
  - Coleta resultados e determina vencedor

- [ ] **GET /api/analytics/ab-tests/{id}**
  - Resultados do teste A/B
  - Métricas por variação
  - Análise estatística (significância)
  - Recomendação de qual usar

- [ ] **GET /api/analytics/predictions**
  - Previsões de performance futura
  - Baseado em dados históricos + ML
  - Estimativa de views/engajamento para próximo post
  - Melhor horário para próxima publicação

- [ ] **POST /api/analytics/refresh**
  - Força atualização de dados das plataformas
  - Útil para métricas recentes
  - Rate limited (evitar abuse)

- [ ] **GET /api/analytics/export**
  - Export de relatórios
  - Formatos: CSV, PDF, Excel
  - Customizável: escolher métricas, período, filtros
  - Agendamento de relatórios recorrentes (daily, weekly, monthly)

### Services

- [ ] **AnalyticsCollector** (Background Job)
  - Executa periodicamente (a cada hora)
  - Busca dados das APIs das plataformas
  - Atualiza métricas de cada publicação
  - Calcula métricas derivadas (engagement rate, growth, etc)
  
  ```python
  class AnalyticsCollector:
      def collect_all_analytics(self):
          """Coleta analytics de todas as publicações ativas"""
          publications = get_active_publications()
          
          for publication in publications:
              try:
                  self.collect_publication_analytics(publication)
              except Exception as e:
                  logger.error(f"Failed to collect analytics for {publication.id}", exc_info=e)
      
      def collect_publication_analytics(self, publication: Publication):
          """Coleta analytics de uma publicação específica"""
          channel = publication.channel
          platform_service = get_platform_analytics_service(channel.platform)
          
          # Coleta dados da plataforma
          data = platform_service.get_analytics(
              channel=channel,
              external_id=publication.external_id
          )
          
          # Atualiza publication com novos dados
          publication.analytics = {
              **publication.analytics,
              **data,
              'last_updated': datetime.now().isoformat()
          }
          publication.save()
          
          # Cria snapshot histórico
          AnalyticsSnapshot.create(
              publication_id=publication.id,
              timestamp=datetime.now(),
              metrics=data
          )
  ```

- [ ] **YouTubeAnalyticsService**
  - Integração com YouTube Analytics API
  - Coleta: views, likes, comments, shares, watch time, retention
  
  ```python
  class YouTubeAnalyticsService:
      def get_analytics(self, channel: Channel, external_id: str) -> dict:
          """Coleta analytics do YouTube"""
          credentials = get_oauth_token(channel.id)
          youtube_analytics = build('youtubeAnalytics', 'v2', credentials=credentials)
          
          # Data range (últimos 30 dias)
          end_date = datetime.now().date()
          start_date = end_date - timedelta(days=30)
          
          # Query analytics
          response = youtube_analytics.reports().query(
              ids=f'channel=={channel.external_id}',
              startDate=start_date.isoformat(),
              endDate=end_date.isoformat(),
              metrics='views,likes,comments,shares,estimatedMinutesWatched,averageViewDuration',
              dimensions='video',
              filters=f'video=={external_id}'
          ).execute()
          
          if response['rows']:
              row = response['rows'][0]
              return {
                  'views': row[1],
                  'likes': row[2],
                  'comments': row[3],
                  'shares': row[4],
                  'watch_time_minutes': row[5],
                  'avg_view_duration': row[6],
                  'engagement_rate': self.calculate_engagement_rate(row)
              }
          
          return {}
      
      def calculate_engagement_rate(self, row):
          """Calcula taxa de engajamento"""
          views = row[1]
          interactions = row[2] + row[3] + row[4]  # likes + comments + shares
          return (interactions / views * 100) if views > 0 else 0
  ```

- [ ] **TikTokAnalyticsService**
  - Integração com TikTok Analytics API
  - Coleta: views, likes, comments, shares, play count, completion rate

- [ ] **InstagramAnalyticsService**
  - Integração com Instagram Insights API
  - Coleta: views, likes, comments, shares, saves, reach, impressions

- [ ] **InsightGenerator** (IA)
  - Analisa dados históricos com ML
  - Identifica padrões e correlações
  - Gera insights acionáveis
  
  ```python
  class InsightGenerator:
      def generate_insights(self, user_id: int) -> List[dict]:
          """Gera insights baseados em dados históricos"""
          publications = get_user_publications(user_id, limit=100)
          insights = []
          
          # Insight 1: Melhores horários
          best_hours = self.analyze_best_posting_times(publications)
          if best_hours:
              insights.append({
                  'type': 'best_time',
                  'title': 'Melhores Horários de Publicação',
                  'description': f"Posts entre {best_hours['start']}h-{best_hours['end']}h têm {best_hours['boost']}% mais views",
                  'actionable': f"Agende próximos posts para {best_hours['optimal']}h",
                  'confidence': best_hours['confidence']
              })
          
          # Insight 2: Tipos de conteúdo
          best_content = self.analyze_content_performance(publications)
          if best_content:
              insights.append({
                  'type': 'content_type',
                  'title': 'Tipos de Conteúdo com Melhor Performance',
                  'description': f"Highlights com {best_content['indicator']} alto performam {best_content['boost']}% melhor",
                  'actionable': f"Priorize highlights com {best_content['indicator']} score acima de {best_content['threshold']}",
                  'confidence': best_content['confidence']
              })
          
          # Insight 3: Duração ideal
          optimal_duration = self.analyze_optimal_duration(publications)
          if optimal_duration:
              insights.append({
                  'type': 'duration',
                  'title': 'Duração Ideal de Clipes',
                  'description': f"Clipes de {optimal_duration['range']}s têm melhor completion rate",
                  'actionable': f"Mantenha clipes entre {optimal_duration['min']}-{optimal_duration['max']} segundos",
                  'confidence': optimal_duration['confidence']
              })
          
          # Insight 4: Canais com melhor ROI
          top_channels = self.analyze_channel_roi(publications)
          insights.append({
              'type': 'channel_roi',
              'title': 'Canais com Melhor ROI',
              'description': f"Canal '{top_channels[0]['name']}' tem ROI {top_channels[0]['roi']}x",
              'actionable': f"Priorize publicação nos canais: {', '.join([c['name'] for c in top_channels[:3]])}",
              'confidence': 'high'
          })
          
          # Insight 5: Correlação Indicadores vs Performance
          indicator_correlation = self.analyze_indicator_accuracy(publications)
          insights.append({
              'type': 'indicator_validation',
              'title': 'Validação dos Indicadores da IA',
              'description': f"Profitability score da IA tem {indicator_correlation['accuracy']}% de acurácia",
              'actionable': "Confie nas recomendações da IA - elas estão funcionando!" if indicator_correlation['accuracy'] > 70 else "IA precisa recalibração",
              'confidence': 'high'
          })
          
          return insights
      
      def analyze_best_posting_times(self, publications):
          """Analisa melhores horários para postar"""
          # Agrupa por hora do dia
          hourly_performance = defaultdict(list)
          
          for pub in publications:
              if pub.published_at and pub.analytics.get('views'):
                  hour = pub.published_at.hour
                  views = pub.analytics['views']
                  hourly_performance[hour].append(views)
          
          # Calcula média por hora
          avg_by_hour = {
              hour: sum(views) / len(views) 
              for hour, views in hourly_performance.items()
          }
          
          if not avg_by_hour:
              return None
          
          overall_avg = sum(avg_by_hour.values()) / len(avg_by_hour)
          best_hour = max(avg_by_hour, key=avg_by_hour.get)
          best_avg = avg_by_hour[best_hour]
          
          boost = ((best_avg - overall_avg) / overall_avg) * 100
          
          if boost > 20:  # Significativo
              return {
                  'optimal': best_hour,
                  'start': best_hour - 1,
                  'end': best_hour + 1,
                  'boost': round(boost, 1),
                  'confidence': 'high' if len(publications) > 50 else 'medium'
              }
          
          return None
      
      def analyze_indicator_accuracy(self, publications):
          """Valida acurácia dos indicadores da IA"""
          correct_predictions = 0
          total_predictions = 0
          
          for pub in publications:
              if not pub.highlight or not pub.analytics.get('views'):
                  continue
              
              predicted_profitability = pub.highlight.profitability_score
              actual_views = pub.analytics['views']
              
              # Normaliza views para 0-10
              max_views = max([p.analytics.get('views', 0) for p in publications])
              normalized_views = (actual_views / max_views) * 10 if max_views > 0 else 0
              
              # Considera correto se diferença < 2 pontos
              if abs(predicted_profitability - normalized_views) < 2:
                  correct_predictions += 1
              
              total_predictions += 1
          
          accuracy = (correct_predictions / total_predictions * 100) if total_predictions > 0 else 0
          
          return {
              'accuracy': round(accuracy, 1),
              'total_predictions': total_predictions
          }
  ```

- [ ] **ABTestManager**
  - Gerencia experimentos A/B
  - Distribui publicações entre variações
  - Análise estatística de resultados
  
  ```python
  class ABTestManager:
      def create_test(self, clip_id: int, variations: List[dict], channels: List[int]):
          """Cria teste A/B"""
          test = ABTest.create(
              clip_id=clip_id,
              status='running',
              variations=variations,
              start_date=datetime.now()
          )
          
          # Distribui canais entre variações
          for i, channel_id in enumerate(channels):
              variation_index = i % len(variations)
              variation = variations[variation_index]
              
              publication = Publication.create(
                  clip_id=clip_id,
                  channel_id=channel_id,
                  config=variation['config'],
                  ab_test_id=test.id,
                  ab_variation=variation['name']
              )
          
          return test
      
      def analyze_results(self, test_id: int):
          """Analisa resultados do teste A/B"""
          test = get_ab_test(test_id)
          publications = get_publications_by_test(test_id)
          
          results = defaultdict(lambda: {'views': [], 'engagement': []})
          
          for pub in publications:
              if pub.analytics.get('views'):
                  results[pub.ab_variation]['views'].append(pub.analytics['views'])
                  results[pub.ab_variation]['engagement'].append(
                      pub.analytics.get('engagement_rate', 0)
                  )
          
          # Calcula médias
          summary = {}
          for variation, data in results.items():
              summary[variation] = {
                  'avg_views': sum(data['views']) / len(data['views']) if data['views'] else 0,
                  'avg_engagement': sum(data['engagement']) / len(data['engagement']) if data['engagement'] else 0,
                  'sample_size': len(data['views'])
              }
          
          # Determina vencedor
          winner = max(summary, key=lambda v: summary[v]['avg_views'])
          
          # Teste de significância estatística (t-test simplificado)
          if len(summary) == 2:
              variations = list(summary.keys())
              v1_views = results[variations[0]]['views']
              v2_views = results[variations[1]]['views']
              
              # Aqui você implementaria um t-test real
              # Por simplicidade, vamos considerar significativo se diferença > 20%
              v1_avg = summary[variations[0]]['avg_views']
              v2_avg = summary[variations[1]]['avg_views']
              diff_pct = abs(v1_avg - v2_avg) / max(v1_avg, v2_avg) * 100
              
              significant = diff_pct > 20
          else:
              significant = True
          
          return {
              'winner': winner,
              'summary': summary,
              'statistically_significant': significant,
              'recommendation': f"Use variação '{winner}'" if significant else "Teste inconclusivo, coletar mais dados"
          }
  ```

- [ ] **PredictionService** (ML)
  - Previsão de performance futura
  - Baseado em histórico + features do highlight
  - Recomendação de melhor horário/canal
  
  ```python
  class PredictionService:
      def predict_performance(self, highlight_id: int, channel_id: int, scheduled_at: datetime) -> dict:
          """Prevê performance de uma publicação"""
          highlight = get_highlight(highlight_id)
          channel = get_channel(channel_id)
          
          # Features para o modelo
          features = {
              'emotion_score': highlight.emotion_score,
              'virality_score': highlight.virality_score,
              'action_score': highlight.action_score,
              'humor_score': highlight.humor_score,
              'clutch_score': highlight.clutch_score,
              'quality_score': highlight.quality_score,
              'duration': highlight.duration_seconds,
              'hour_of_day': scheduled_at.hour,
              'day_of_week': scheduled_at.weekday(),
              'channel_avg_views': channel.analytics.get('avg_views', 0),
              'channel_followers': channel.analytics.get('followers', 0)
          }
          
          # Carrega modelo treinado (seria um modelo ML real)
          model = self.load_prediction_model()
          
          # Faz previsão
          predicted_views = model.predict([list(features.values())])[0]
          
          # Calcula intervalo de confiança (simplificado)
          confidence_interval = predicted_views * 0.3  # ±30%
          
          return {
              'predicted_views': int(predicted_views),
              'confidence_interval': {
                  'min': int(predicted_views - confidence_interval),
                  'max': int(predicted_views + confidence_interval)
              },
              'confidence': 'medium'
          }
  ```

- [ ] **ReportGenerator**
  - Gera relatórios customizados
  - Export em múltiplos formatos
  - Agendamento de relatórios recorrentes

### Models

- [ ] **AnalyticsSnapshot** (CRIAR novo):
  - **publication_id** (FK): publicação associada
  - **timestamp** (DateTime): quando foi coletado
  - **metrics** (JSON): todas as métricas no momento
    - views, likes, comments, shares, etc
  - Permite tracking de evolução ao longo do tempo
  - Index em timestamp para queries rápidas

- [ ] **Insight** (CRIAR novo):
  - **user_id** (FK): usuário que recebe o insight
  - **type** (Enum: best_time, content_type, duration, channel_roi, etc)
  - **title** (String): título do insight
  - **description** (Text): descrição detalhada
  - **actionable** (Text): ação recomendada
  - **confidence** (Enum: low, medium, high): nível de confiança
  - **data** (JSON): dados que suportam o insight
  - **dismissed** (Boolean): se usuário descartou
  - **created_at**

- [ ] **ABTest** (CRIAR novo):
  - **clip_id** (FK): clipe sendo testado
  - **name** (String): nome do teste
  - **status** (Enum: running, completed, cancelled)
  - **variations** (JSON): lista de variações
  - **start_date**, **end_date**
  - **winner** (String): variação vencedora (quando completo)
  - **results** (JSON): resultados detalhados
  - **created_at**, **updated_at**

- [ ] **Publication** model (ATUALIZAR):
  - Adicionar campo **ab_test_id** (FK nullable)
  - Adicionar campo **ab_variation** (String nullable): qual variação

---

## ⚛️ Frontend - Checklist

### Páginas

- [ ] **AnalyticsDashboardPage** (/analytics)
  - **Overview Cards**:
    - Total Views (com % change)
    - Total Engagement (com % change)
    - Avg Engagement Rate
    - Growth Rate (novos seguidores)
  - **Gráficos principais**:
    - Views ao longo do tempo (line chart)
    - Engagement por plataforma (bar chart)
    - Top 10 clipes (ranked list com thumbnails)
  - **Insights destacados** (cards):
    - 3-5 insights mais relevantes
    - Ações sugeridas
    - Botão "Ver Todos os Insights"
  - **Filtros**:
    - Período: últimos 7 dias, 30 dias, 90 dias, custom
    - Plataforma, canal, país

- [ ] **ClipAnalyticsPage** (/analytics/clips/{id})
  - **Métricas principais**:
    - Total views, likes, comments, shares
    - Engagement rate, completion rate
    - Watch time total
  - **Performance por canal**:
    - Tabela comparativa
    - Qual canal performou melhor
  - **Timeline de engajamento**:
    - Gráfico mostrando evolução dia a dia
    - Picos e vales destacados
  - **Comparação**:
    - vs média dos seus clipes
    - vs clipe anterior
    - Posição no ranking dos seus clipes

- [ ] **InsightsPage** (/analytics/insights)
  - **Lista de insights**:
    - Agrupados por tipo
    - Ordenados por relevância/confiança
    - Cards expansíveis com dados detalhados
  - **Ações por insight**:
    - "Aplicar sugestão" (se aplicável)
    - "Descartar"
    - "Ver dados"
  - **Histórico**:
    - Insights anteriores
    - Quais foram aplicados
    - Resultado após aplicar

- [ ] **ABTestPage** (/analytics/ab-tests)
  - **Lista de testes**:
    - Status: running, completed
    - Período, clipe testado
  - **Criar novo teste**:
    - Selecionar clipe
    - Definir variações (ex: 2 títulos diferentes)
    - Selecionar canais para distribuir
    - Duração do teste
  - **Resultados de teste**:
    - Métricas por variação (side-by-side)
    - Gráficos comparativos
    - Vencedor destacado
    - Significância estatística
    - Botão "Usar vencedor" (aplica para futuras publicações)

- [ ] **PredictionsPage** (/analytics/predictions)
  - **Preview de performance**:
    - Selecionar highlight não publicado
    - Selecionar canal
    - Escolher horário
    - Sistema mostra previsão de views/engajamento
  - **Melhor horário**:
    - Sugestão de quando publicar
    - Heatmap de performance por hora/dia
  - **Comparação de cenários**:
    - "E se publicar agora?" vs "E se publicar amanhã às 18h?"

- [ ] **ReportsPage** (/analytics/reports)
  - **Relatórios prontos**:
    - Weekly summary
    - Monthly performance
    - Channel comparison
  - **Custom report builder**:
    - Escolher métricas
    - Escolher período
    - Escolher filtros
    - Preview + Export
  - **Relatórios agendados**:
    - Configurar envio automático por email
    - Daily, weekly, monthly

### Componentes

- [ ] **MetricCard**
  - Card com métrica principal
  - Valor grande
  - % de mudança (verde/vermelho)
  - Sparkline (mini gráfico)

- [ ] **InsightCard**
  - Card de insight
  - Badge de confiança (high/medium/low)
  - Título e descrição
  - Ação sugerida destacada
  - Botões: aplicar, descartar, detalhes

- [ ] **PerformanceChart**
  - Gráfico de performance ao longo do tempo
  - Múltiplas séries (comparação)
  - Zoom in/out
  - Tooltips informativos

- [ ] **ChannelComparison**
  - Tabela/gráfico comparativo de canais
  - Métricas lado a lado
  - Ranking visual
  - Filtros e ordenação

- [ ] **ABTestResults**
  - Visualização de resultados A/B
  - Side-by-side de variações
  - Gráficos comparativos
  - Badge de vencedor
  - Indicador de significância

- [ ] **PredictionWidget**
  - Widget de previsão interativo
  - Inputs: highlight, canal, horário
  - Output: previsão em tempo real
  - Recomendações visuais

### Lógica

- [ ] **Auto-refresh**:
  - Dashboard atualiza a cada 5 minutos
  - Notificação de novos insights

- [ ] **Comparação**:
  - Selecionar múltiplos clipes/canais para comparar
  - Overlay de gráficos

- [ ] **Drill-down**:
  - Click em métrica → ver detalhes
  - Navegação intuitiva

- [ ] **Export**:
  - Download de relatórios
  - Share links de dashboards

---

## 🧪 Testes

### Backend

- [ ] **Teste: Coleta de analytics**
  - Input: Publicação com external_id válido
  - Expected: Dados coletados da API, analytics atualizado

- [ ] **Teste: Geração de insights**
  - Input: 50+ publicações com dados variados
  - Expected: Insights relevantes gerados (melhores horários, etc)

- [ ] **Teste: Validação de indicadores**
  - Input: Highlights com profitability previsto vs views reais
  - Expected: Cálculo correto de acurácia

- [ ] **Teste: A/B testing**
  - Input: Teste com 2 variações, dados coletados
  - Expected: Vencedor determinado corretamente

- [ ] **Teste: Previsões**
  - Input: Highlight novo + canal
  - Expected: Previsão de views razoável

### Frontend

- [ ] **Teste: Dashboard carrega**
  - Expected: Métricas aparecem, gráficos renderizam

- [ ] **Teste: Filtros funcionam**
  - Input: Filtrar por "últimos 7 dias" + "YouTube"
  - Expected: Dados filtrados corretamente

- [ ] **Teste: Insights são acionáveis**
  - Input: Click "Aplicar sugestão" em insight
  - Expected: Ação executada, feedback visual

- [ ] **Teste: A/B test criação**
  - Input: Criar teste com 2 variações
  - Expected: Teste criado, publicações distribuídas

---

## ✅ Critérios de Conclusão

1. ✅ Analytics são coletados automaticamente de todas as plataformas
2. ✅ Dashboard exibe métricas em tempo real
3. ✅ Insights são gerados automaticamente
4. ✅ Correlação entre indicadores e performance é calculada
5. ✅ A/B testing funciona end-to-end
6. ✅ Previsões são razoavelmente precisas
7. ✅ Relatórios podem ser exportados
8. ✅ Sistema de recomendações é útil
9. ✅ Todos os testes passam

---

## 📝 Próxima Fase

→ **Sistema completo!** Opcional: Melhorias incrementais, automação adicional, integração com mais plataformas

---

**Notas de Implementação:**
- **APIs de Analytics**: cada plataforma tem suas peculiaridades
  - YouTube Analytics API: bem documentada, dados completos
  - TikTok: analytics limitados via API
  - Instagram Insights: requer Business account
- **Rate Limits**: respeitar limites das APIs, coletar com moderação
- **Coleta incremental**: apenas dados novos desde última coleta
- **ML para insights**: pode começar simples (regras), evoluir para ML real
- **A/B testing**: precisa de volume mínimo para ser significativo
- **Privacy**: não expor dados de outros usuários
- **Performance**: analytics pode gerar muito dados, otimizar queries
- **Caching**: cachear métricas agregadas (recalcular apenas quando necessário)
- **Real-time vs batch**: dashboard real-time, insights batch (diário)
- **Visualizações**: usar biblioteca robusta (Chart.js, Recharts, D3.js)
- **Previsões**: começar com modelo simples (linear regression), pode evoluir
- **Validação contínua**: sempre comparar previsões vs realidade para melhorar
- **Feedback loop**: usar dados de analytics para melhorar IA das Fases 4 e 5
