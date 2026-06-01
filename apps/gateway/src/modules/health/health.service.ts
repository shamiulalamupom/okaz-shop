import type { Context } from 'hono';

export const createHealthService = (authServiceUrl: string) => {
  return {
    async isReady(c: Context) {
      const response = await fetch(`${authServiceUrl}/ready`, {
        headers: {
          'x-request-id': c.get('requestId')
        }
      });

      return response.ok;
    }
  };
};
