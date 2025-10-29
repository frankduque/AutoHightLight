# Fase 2: Download do Vídeo 📥

**Duração:** 2 dias
**Objetivo:** Baixar o vídeo, permitir a visualização e dar a opção de iniciar a transcrição.

## Backend

- ### Endpoint: `POST /api/videos/{id}/download`
  - **Ações:**
    1. Atualiza o status do vídeo para `downloading`.
    2. Inicia o download de forma assíncrona usando `yt-dlp` (melhor qualidade, ex: 1080p).
    3. Salva o arquivo de vídeo em `storage/videos/{id}/original.mp4`.
    4. Durante o download, o progresso pode ser consultado através do endpoint de status.
    5. Ao concluir, atualiza o status do vídeo para `download_completed`.
  - **Retorna:** Uma resposta de sucesso imediata (202 Accepted) para indicar que o processo começou.

- ### Endpoint: `GET /api/videos/{id}/status`
  - **Ações:**
    - Retorna o status atual do vídeo e, se estiver em `downloading`, o progresso (porcentagem, velocidade, tempo estimado).
  - **Retorna:**
    ```json
    {
      "status": "downloading",
      "progress": {
        "percentage": 25.5,
        "speed_mbps": 1.2,
        "eta_seconds": 180
      }
    }
    ```

- ### Service: `VideoDownloader`
  - Encapsula a lógica de integração com `yt-dlp`.
  - Implementa callbacks para capturar o progresso do download.
  - Gerencia erros (ex: vídeo indisponível, falha no download) e atualiza o status do vídeo para `failed` se necessário.

## Frontend

- ### Página: `VideoDetail` (quando o status é `metadata_fetched`)
  - Exibe os metadados do vídeo.
  - Apresenta um botão proeminente: **"Iniciar Download"**.

- ### Durante o Download (status: `downloading`)
  - A página `VideoDetail` faz polling (requisições periódicas) ao endpoint `GET /api/videos/{id}/status`.
  - **Componente `DownloadProgress`:**
    - Exibe uma barra de progresso visual.
    - Mostra informações textuais como "Baixando... 25%", velocidade e tempo restante.
    - O botão de download fica desabilitado.

- ### Após o Download (status: `download_completed`)
  - A área de progresso é substituída por um player de vídeo.
  - **Componente `VideoPlayer`:**
    - Carrega e exibe o vídeo baixado (`storage/videos/{id}/original.mp4`).
    - Permite que o usuário assista ao conteúdo completo para garantir que o download foi bem-sucedido.
  - Um novo botão de ação principal aparece: **"Iniciar Transcrição"**.

## Status do Vídeo

- **Inicia em:** `metadata_fetched`
- **Durante:** `downloading`
- **Termina em:** `download_completed`
