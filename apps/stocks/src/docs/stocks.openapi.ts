export const stocksOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Okaz Stocks API',
    version: '1.0.0',
    description: 'Manages stores and the available quantity of each product per store.'
  },
  tags: [
    { name: 'Stores', description: 'Stores (magasins) of the marketplace' },
    { name: 'Stocks', description: 'Available quantity per product and per store' },
    { name: 'Health', description: 'Liveness and readiness probes' }
  ],
  components: {
    schemas: {
      Store: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          city: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Stock: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          storeId: { type: 'string' },
          quantity: { type: 'integer' }
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
    '/stores': {
      get: {
        tags: ['Stores'],
        summary: 'List stores',
        responses: { '200': { description: 'List of stores' } }
      },
      post: {
        tags: ['Stores'],
        summary: 'Create a store',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: { name: { type: 'string' }, city: { type: 'string' } },
                required: ['name']
              }
            }
          }
        },
        responses: { '201': { description: 'Store created' }, '400': { description: 'Validation error' } }
      }
    },
    '/stores/{id}': {
      get: {
        tags: ['Stores'],
        summary: 'Get a store by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Store found' }, '404': { description: 'Store not found' } }
      }
    },
    '/stocks': {
      get: {
        tags: ['Stocks'],
        summary: 'List stock entries (optionally filtered by productId / storeId)',
        parameters: [
          { name: 'productId', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'storeId', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'List of stock entries' } }
      },
      post: {
        tags: ['Stocks'],
        summary: 'Set the absolute quantity of a product in a store',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  productId: { type: 'string' },
                  storeId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 0 }
                },
                required: ['productId', 'storeId', 'quantity']
              }
            }
          }
        },
        responses: { '200': { description: 'Stock set' }, '400': { description: 'Validation error' } }
      }
    },
    '/stocks/adjust': {
      post: {
        tags: ['Stocks'],
        summary: 'Adjust the quantity of a product in a store by a signed delta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  productId: { type: 'string' },
                  storeId: { type: 'string' },
                  delta: { type: 'integer' }
                },
                required: ['productId', 'storeId', 'delta']
              }
            }
          }
        },
        responses: { '200': { description: 'Stock adjusted' }, '400': { description: 'Validation error' } }
      }
    },
    '/stocks/{productId}': {
      get: {
        tags: ['Stocks'],
        summary: 'Get aggregated stock for a product across all stores',
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Aggregated stock for the product' } }
      }
    }
  }
};
