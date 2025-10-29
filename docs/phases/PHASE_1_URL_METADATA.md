# Fase 1: Adicionar Vídeo → Fetch Metadata → Review 📹

**Duração:** 2-3 dias
**Objetivo:** Colar URL, buscar dados, revisar antes de salvar.

## Backend

- ### Endpoint: `POST /api/videos/fetch-metadata`
  - **Recebe:** `{ "url": "https://www.youtube.com/watch?v=..." }`
  - **Ações:**
    1. Valida o formato da URL do YouTube.
    2. Extrai o `youtube_id` do vídeo.
    3. Usa `yt-dlp` para buscar os metadados do vídeo (título, descrição, thumbnail, duração, etc.).
    4. Busca os metadados do canal (nome, id do canal, etc.).
  - **Retorna:** Um JSON com os metadados completos do vídeo e do canal para o frontend revisar.
    ```json
    {
      "video": {
        "youtube_id": "...",
        "title": "...",
        "description": "...",
        "thumbnail_url": "...",
        "duration_seconds": 123
      },
      "channel": {
        "channel_id": "...",
        "name": "...",
        "thumbnail_url": "..."
      }
    }
    ```

- ### Endpoint: `POST /api/videos`
  - **Recebe:** O objeto de metadados (possivelmente editado) do frontend.
  - **Ações:**
    1. **Verifica se o Canal Existe:** Procura no banco de dados pelo `channel_id`.
    2. **Cria o Canal (se não existir):** Se o canal não for encontrado, cria uma nova entrada na tabela `channels` com os dados recebidos.
    3. **Cria o Vídeo:** Salva os dados do vídeo na tabela `videos`, associando-o ao ID do canal (novo ou existente).
    4. Define o `status` do vídeo como `metadata_fetched`.
  - **Retorna:** O objeto do vídeo recém-criado, incluindo o ID.

## Frontend

- ### Página: "Adicionar Vídeo"
  - Um campo de input para colar a URL do YouTube.
  - Um botão "Buscar" que, ao ser clicado, chama o endpoint `POST /api/videos/fetch-metadata`.
  - Exibe um estado de "carregando" enquanto a busca está em andamento.

- ### Componente: `MetadataReview`
  - É exibido após o retorno bem-sucedido do `fetch-metadata`.
  - **Exibe os dados:**
    - Thumbnail do vídeo.
    - Título (em um campo de input, permitindo edição).
    - Descrição (em uma `textarea`, permitindo edição).
    - Informações do canal (nome, thumbnail) - (somente leitura).
    - Duração, contagem de views, etc. - (somente leitura).
  - **Ações:**
    - Botão "Cancelar": Descarta os dados e limpa a interface.
    - Botão "Confirmar e Salvar": Envia os dados (editados ou não) para o endpoint `POST /api/videos`.
  - Após o salvamento, redireciona o usuário para a página de detalhes do vídeo (ex: `/videos/{id}`).

## Status do Vídeo

- Ao final desta fase, o vídeo terá o status: `metadata_fetched`.
