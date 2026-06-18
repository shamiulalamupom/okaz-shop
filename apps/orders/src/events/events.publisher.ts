import { createLogger } from '@okaz/shared';

import { ordersConfig } from '../config/orders.config.js';

const logger = createLogger('orders-events');

export type OrderEvent = {
  type: 'order.created' | 'order.validated' | 'order.rejected' | 'order.cancelled';
  orderId: string;
  userId: string;
  status: string;
  total: number;
  at: string;
};

/**
 * Publishes a critical order event to the events sink (the gateway), which fans it
 * out to connected frontends over WebSocket. Best-effort: a failure here must never
 * break order processing.
 */
export const publishOrderEvent = async (event: OrderEvent, requestId: string): Promise<void> => {
  if (!ordersConfig.eventsSinkUrl) {
    return;
  }

  try {
    const url = new URL('/internal/events', ordersConfig.eventsSinkUrl);
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-internal-secret': ordersConfig.internalServiceSecret
      },
      body: JSON.stringify(event)
    });
  } catch (error) {
    logger.warn('event_publish_failed', {
      type: event.type,
      orderId: event.orderId,
      message: error instanceof Error ? error.message : 'unknown'
    });
  }
};
