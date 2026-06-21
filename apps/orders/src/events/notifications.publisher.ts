import { createLogger } from '@okaz/shared';

import { ordersConfig } from '../config/orders.config.js';

const logger = createLogger('orders-notifications');

export type OrderNotificationEvent = {
  type: 'order.placed' | 'order.validated' | 'order.rejected' | 'order.delivered';
  orderId: string;
  /** The customer who owns the order. */
  customerId: string;
  /** Whoever triggered this transition; the notifications service excludes them. */
  actorId: string;
  total: number;
};

/**
 * Notifies the notifications service of an order lifecycle event. That service owns
 * the policy (recipients, copy, exclude-actor rule). Best-effort: a failure here must
 * never break order processing.
 */
export const publishOrderNotification = async (
  event: OrderNotificationEvent,
  requestId: string
): Promise<void> => {
  if (!ordersConfig.notificationsServiceUrl) {
    return;
  }

  try {
    const url = new URL('/internal/events', ordersConfig.notificationsServiceUrl);
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
    logger.warn('notification_publish_failed', {
      type: event.type,
      orderId: event.orderId,
      message: error instanceof Error ? error.message : 'unknown'
    });
  }
};
