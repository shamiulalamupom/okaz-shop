import { createLogger } from '@okaz/shared';

import { notificationsConfig } from '../config/notifications.config.js';

const logger = createLogger('notifications-events');

/**
 * Pushes a "new notification" signal to the events sink (the gateway), which fans
 * it out to the recipient's connected frontends over WebSocket so the bell updates
 * live. Best-effort: a failure here must never break notification persistence.
 */
export const publishNotificationCreated = async (recipientId: string, requestId: string): Promise<void> => {
  if (!notificationsConfig.eventsSinkUrl) {
    return;
  }

  try {
    const url = new URL('/internal/events', notificationsConfig.eventsSinkUrl);
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-internal-secret': notificationsConfig.internalServiceSecret
      },
      body: JSON.stringify({ type: 'notification.new', userId: recipientId })
    });
  } catch (error) {
    logger.warn('event_publish_failed', {
      recipientId,
      message: error instanceof Error ? error.message : 'unknown'
    });
  }
};
