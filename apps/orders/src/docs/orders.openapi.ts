export const ordersOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Okaz Orders API',
    version: '1.0.0',
    description: 'Creates and validates customer orders against available stock.'
  },
  tags: [
    { name: 'Orders', description: 'Order creation, validation and tracking' },
    { name: 'Health', description: 'Liveness and readiness probes' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'VALIDATED', 'REJECTED', 'CANCELLED'] },
          total: { type: 'number' },
          reason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                storeId: { type: 'string' },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' }
              }
            }
          }
        }
      }
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
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: "List the authenticated user's orders",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of orders' }, '401': { description: 'Unauthorized' } }
      },
      post: {
        tags: ['Orders'],
        summary: 'Create an order (validated against stock)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      properties: {
                        productId: { type: 'string' },
                        storeId: { type: 'string' },
                        quantity: { type: 'integer', minimum: 1 }
                      },
                      required: ['productId', 'storeId', 'quantity']
                    }
                  }
                },
                required: ['items']
              }
            }
          }
        },
        responses: {
          '201': { description: 'Order created and validated' },
          '400': { description: 'Validation error or unknown product' },
          '401': { description: 'Unauthorized' },
          '409': { description: 'Order rejected (insufficient stock)' }
        }
      }
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get an order by id',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Order found' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Order not found' }
        }
      }
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel an order and release reserved stock',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Order cancelled' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Order not found' },
          '409': { description: 'Order cannot be cancelled' }
        }
      }
    }
  }
};
