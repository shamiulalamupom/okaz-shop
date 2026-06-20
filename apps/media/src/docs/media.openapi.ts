export const mediaOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Okaz Media API',
    version: '1.0.0',
    description: 'Pre-signed image uploads to Cloudflare R2 with Postgres metadata and CDN serving.'
  },
  tags: [
    { name: 'Media', description: 'Pre-signed uploads and media metadata' },
    { name: 'Health', description: 'Liveness and readiness probes' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  paths: {
    '/live': { get: { tags: ['Health'], summary: 'Liveness probe', responses: { '200': { description: 'Live' } } } },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } }
      }
    },
    '/media/uploads': {
      post: {
        tags: ['Media'],
        summary: 'Request a pre-signed PUT upload (R2-compatible)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  purpose: { type: 'string', enum: ['PRODUCT_IMAGE', 'PROFILE_IMAGE'] },
                  contentType: { type: 'string', example: 'image/png' },
                  fileSize: { type: 'integer', minimum: 1 },
                  fileName: { type: 'string' },
                  linkedId: { type: 'string', description: 'e.g. productId for PRODUCT_IMAGE' }
                },
                required: ['purpose', 'contentType', 'fileSize']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Pre-signed upload issued' },
          '400': { description: 'Unsupported content type / validation error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden (product images require manager/admin)' },
          '413': { description: 'File too large' }
        }
      }
    },
    '/media/uploads/{id}/complete': {
      post: {
        tags: ['Media'],
        summary: 'Finalize an upload after the object has been PUT to the store',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Media is READY (returns cdnUrl)' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Media not found' },
          '422': { description: 'Uploaded object not found in store' }
        }
      }
    },
    '/media/{id}': {
      get: {
        tags: ['Media'],
        summary: 'Get media metadata (and cdnUrl when READY)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Media metadata' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Media not found' }
        }
      }
    }
  }
};
