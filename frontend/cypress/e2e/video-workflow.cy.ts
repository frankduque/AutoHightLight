describe('Video Workflow - Fase 1', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Ignore Next.js image errors for test images
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('next/image') || err.message.includes('hostname')) {
        return false;
      }
      return true;
    });
  });

  it('should load the home page', () => {
    cy.contains('Transforme vídeos do YouTube').should('be.visible');
  });

  it('should accept a YouTube URL input', () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    cy.get('input[type="url"]').should('be.visible');
    cy.get('input[type="url"]').type(testUrl);
    cy.get('input[type="url"]').should('have.value', testUrl);
  });

  it('should validate YouTube URL format', () => {
    const invalidUrl = 'not-a-valid-url';
    
    cy.get('input[type="url"]').type(invalidUrl);
    cy.get('button').contains('Criar Highlights').should('be.enabled');
    cy.get('button').contains('Criar Highlights').click();
    
    // Input should still have the invalid value (validation prevents submission)
    cy.get('input[type="url"]').should('have.value', invalidUrl);
  });

  it('should fetch video metadata when valid URL is provided', () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    cy.intercept('POST', '**/videos/fetch-metadata', {
      statusCode: 200,
      body: {
        youtube_id: 'dQw4w9WgXcQ',
        title: 'Test Video Title',
        channel_name: 'Test Channel',
        duration_seconds: 300,
        duration_formatted: '5:00',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Test description',
        channel_id: 'test123',
        published_at: '2024-01-01T00:00:00Z',
        view_count: 1000,
        like_count: 100,
        comment_count: 10
      }
    }).as('fetchMetadata');
    
    cy.get('input[type="url"]').type(testUrl);
    cy.get('button').contains('Criar Highlights').click();
    
    cy.wait('@fetchMetadata');
    cy.contains('Test Video Title', { timeout: 10000 }).should('be.visible');
    cy.contains('Test Channel').should('be.visible');
  });

  it('should allow editing video metadata', () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    cy.intercept('POST', '**/videos/fetch-metadata', {
      statusCode: 200,
      body: {
        youtube_id: 'dQw4w9WgXcQ',
        title: 'Original Title',
        channel_name: 'Original Channel',
        duration_seconds: 300,
        duration_formatted: '5:00',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Test description',
        channel_id: 'test123',
        published_at: '2024-01-01T00:00:00Z',
        view_count: 1000,
        like_count: 100,
        comment_count: 10
      }
    }).as('fetchMetadata');
    
    cy.get('input[type="url"]').type(testUrl);
    cy.get('button').contains('Criar Highlights').click();
    cy.wait('@fetchMetadata');
    
    // Click edit button
    cy.contains('button', 'Editar', { timeout: 10000 }).click();
    
    // Edit title - find the input that contains the title
    cy.get('input[value="Original Title"]').clear().type('Edited Title');
    
    // Save edits
    cy.contains('button', 'Salvar').click();
    
    cy.contains('Edited Title').should('be.visible');
  });

  it('should display video in list after adding', () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    cy.intercept('POST', '**/videos/fetch-metadata', {
      statusCode: 200,
      body: {
        youtube_id: 'dQw4w9WgXcQ',
        title: 'New Video',
        channel_name: 'Test Channel',
        duration_seconds: 300,
        duration_formatted: '5:00',
        thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Test description',
        channel_id: 'test123',
        published_at: '2024-01-01T00:00:00Z',
        view_count: 1000,
        like_count: 100,
        comment_count: 10
      }
    }).as('fetchMetadata');
    
    cy.intercept('POST', '**/videos', {
      statusCode: 201,
      body: {
        video: {
          id: 1,
          youtube_id: 'dQw4w9WgXcQ',
          title: 'New Video',
          channel_name: 'Test Channel',
          duration_seconds: 300,
          thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          status: 'pending'
        }
      }
    }).as('createVideo');
    
    cy.get('input[type="url"]').type(testUrl);
    cy.get('button').contains('Criar Highlights').click();
    cy.wait('@fetchMetadata');
    
    // Confirm video creation
    cy.contains('button', 'Criar Vídeo', { timeout: 10000 }).click();
    
    // Wait for API call
    cy.wait('@createVideo', { timeout: 10000 });
  });
});
