export const gatewayOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Okaz Gateway API',
    version: '1.0.0'
  },
  tags: [
    { name: 'Auth', description: 'Authentication routes proxied to the auth service' },
    { name: 'Products', description: 'Product routes proxied to the products service' },
    { name: 'Miscellaneous', description: 'Health probes and demo routes' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'MongoDB product id' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    requestBodies: {
      credentials: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                email: { type: 'string', format: 'email', maxLength: 320 },
                password: { type: 'string', minLength: 8, maxLength: 128 }
              },
              required: ['email', 'password']
            }
          }
        }
      },
      productCreate: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                price: { type: 'number', exclusiveMinimum: 0 },
                category: { type: 'string' }
              },
              required: ['name', 'price']
            }
          }
        }
      },
      productUpdate: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                price: { type: 'number', exclusiveMinimum: 0 },
                category: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/live': {
      get: {
        tags: ['Miscellaneous'],
        summary: 'Gateway liveness probe',
        responses: {
          '200': { description: 'Gateway is live' }
        }
      }
    },
    '/ready': {
      get: {
        tags: ['Miscellaneous'],
        summary: 'Gateway readiness probe',
        responses: {
          '200': { description: 'Gateway is ready' },
          '503': { description: 'Gateway is not ready' }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Proxy register to auth service',
        requestBody: {
          $ref: '#/components/requestBodies/credentials'
        },
        responses: {
          '201': { description: 'Registered' },
          '400': { description: 'Validation error' },
          '413': { description: 'Payload too large' },
          '409': { description: 'Email already exists' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Proxy login to auth service',
        requestBody: {
          $ref: '#/components/requestBodies/credentials'
        },
        responses: {
          '200': { description: 'Authenticated' },
          '400': { description: 'Validation error' },
          '413': { description: 'Payload too large' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Rate limited' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Proxy me to auth service',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Authenticated user' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (proxied to products service)',
        responses: {
          '200': {
            description: 'List of products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Product' } }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product (proxied to products service)',
        security: [{ bearerAuth: [] }],
        requestBody: { $ref: '#/components/requestBodies/productCreate' },
        responses: {
          '201': { description: 'Product created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/products/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
      ],
      get: {
        tags: ['Products'],
        summary: 'Get a product by id (proxied to products service)',
        responses: {
          '200': {
            description: 'Product found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' }
              }
            }
          },
          '404': { description: 'Product not found' }
        }
      },
      put: {
        tags: ['Products'],
        summary: 'Update a product (proxied to products service)',
        security: [{ bearerAuth: [] }],
        requestBody: { $ref: '#/components/requestBodies/productUpdate' },
        responses: {
          '200': { description: 'Product updated' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Product not found' }
        }
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product (proxied to products service)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Product deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Product not found' }
        }
      }
    },
    '/protected': {
      get: {
        tags: ['Miscellaneous'],
        summary: 'Protected demo route',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Accessible by any authenticated user' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/admin': {
      get: {
        tags: ['Miscellaneous'],
        summary: 'Admin-only demo route',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Accessible by ADMIN role' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      }
    }
  }
};
