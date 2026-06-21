export const notificationsOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'Okaz Notifications API',
    version: '1.0.0',
    description: 'In-app notifications for order lifecycle events.'
  },
  tags: [
    { name: 'Notifications', description: 'Per-user notification feed' },
    { name: 'Health', description: 'Liveness and readiness probes' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['ORDER_PLACED', 'ORDER_VALIDATED', 'ORDER_REJECTED', 'ORDER_DELIVERED']
          },
          title: { type: 'string' },
          body: { type: 'string' },
          orderId: { type: 'string', nullable: true },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
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
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: "List the authenticated user's notifications",
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'List of notifications' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Count unread notifications',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Unread count' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark all notifications read',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Marked read' }, '401': { description: 'Unauthorized' } }
      }
    },
    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark a notification read',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Marked read' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Notification not found' }
        }
      }
    }
  }
};
