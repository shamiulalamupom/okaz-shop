import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { notificationsConfig } from '../../config/notifications.config.js';
import { orderEventSchema } from './notifications.schemas.js';
import { notificationsService } from './notifications.service.js';

export const listNotificationsController = async (c: Context) => {
  const user = c.get('user');
  const notifications = await notificationsService.listForRecipient(user.id);
  return c.json({ data: notifications }, 200);
};

export const unreadCountController = async (c: Context) => {
  const user = c.get('user');
  const count = await notificationsService.unreadCount(user.id);
  return c.json({ count }, 200);
};

export const markReadController = async (c: Context) => {
  const user = c.get('user');
  const updated = await notificationsService.markRead(c.req.param('id')!, user.id);

  if (!updated) {
    return c.json({ message: 'Notification not found' }, 404);
  }

  return c.json({ ok: true }, 200);
};

export const markAllReadController = async (c: Context) => {
  const user = c.get('user');
  const count = await notificationsService.markAllRead(user.id);
  return c.json({ ok: true, count }, 200);
};

// --- Internal (service-to-service) ---

export const ingestEventController = async (c: Context) => {
  const requestId = c.get('requestId');

  const parsed = await parseJsonBody(c, orderEventSchema, {
    maxBytes: notificationsConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const result = await notificationsService.ingestOrderEvent(parsed.data, requestId);
  return c.json(result, 202);
};
