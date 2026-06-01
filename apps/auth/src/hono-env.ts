import type { UserContext } from '@okaz/shared';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    user: UserContext;
  }
}

export {};
