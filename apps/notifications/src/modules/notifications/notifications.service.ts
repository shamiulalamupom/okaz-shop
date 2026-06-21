import { createLogger } from '@okaz/shared';
import type { Notification, NotificationType } from '../../../prisma/generated/client/index.js';

import { fetchStaffIds } from '../../clients/auth.client.js';
import { prisma } from '../../db/prisma.client.js';
import { publishNotificationCreated } from '../../events/events.publisher.js';
import type { OrderEventInput } from './notifications.schemas.js';

const logger = createLogger('notifications-service');

const serializeNotification = (notification: Notification) => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  orderId: notification.orderId,
  read: notification.read,
  createdAt: notification.createdAt
});

const shortId = (id: string) => id.slice(-8);

const formatTotal = (total: number | undefined) =>
  total === undefined ? '' : ` · €${total.toFixed(2)}`;

/**
 * Maps an order lifecycle event to the notification(s) it should produce. Returns
 * one descriptor per recipient. The actor is never returned (exclude-actor rule):
 * this elegantly suppresses the redundant "validated" notification when an order
 * auto-validates at creation (actor == customer).
 */
type Descriptor = {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string;
};

const buildDescriptors = async (event: OrderEventInput, requestId: string): Promise<Descriptor[]> => {
  const short = shortId(event.orderId);
  const amount = formatTotal(event.total);

  switch (event.type) {
    case 'order.placed': {
      const staffIds = await fetchStaffIds(requestId);
      return staffIds
        .filter((id) => id !== event.actorId)
        .map((recipientId) => ({
          recipientId,
          type: 'ORDER_PLACED' as const,
          title: 'New order placed',
          body: `Order #${short}${amount} is awaiting fulfilment.`,
          orderId: event.orderId
        }));
    }
    case 'order.validated': {
      if (event.customerId === event.actorId) return [];
      return [
        {
          recipientId: event.customerId,
          type: 'ORDER_VALIDATED',
          title: 'Order validated',
          body: `Your order #${short}${amount} has been validated.`,
          orderId: event.orderId
        }
      ];
    }
    case 'order.rejected': {
      if (event.customerId === event.actorId) return [];
      return [
        {
          recipientId: event.customerId,
          type: 'ORDER_REJECTED',
          title: 'Order rejected',
          body: `Your order #${short}${amount} could not be fulfilled.`,
          orderId: event.orderId
        }
      ];
    }
    case 'order.delivered': {
      if (event.customerId === event.actorId) return [];
      return [
        {
          recipientId: event.customerId,
          type: 'ORDER_DELIVERED',
          title: 'Order delivered',
          body: `Your order #${short}${amount} has been delivered.`,
          orderId: event.orderId
        }
      ];
    }
    default:
      return [];
  }
};

export const notificationsService = {
  /** Lists the recipient's notifications, newest first. */
  async listForRecipient(recipientId: string) {
    const notifications = await prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return notifications.map(serializeNotification);
  },

  async unreadCount(recipientId: string) {
    return prisma.notification.count({ where: { recipientId, read: false } });
  },

  /** Marks a single notification read, only if it belongs to the recipient. */
  async markRead(notificationId: string, recipientId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { read: true }
    });

    return result.count > 0;
  },

  async markAllRead(recipientId: string) {
    const result = await prisma.notification.updateMany({
      where: { recipientId, read: false },
      data: { read: true }
    });

    return result.count;
  },

  /**
   * Ingests an order lifecycle event: persists a notification row per recipient and
   * pushes a live signal so the recipient's bell updates over WebSocket.
   */
  async ingestOrderEvent(event: OrderEventInput, requestId: string) {
    const descriptors = await buildDescriptors(event, requestId);

    if (descriptors.length === 0) {
      return { created: 0 };
    }

    await prisma.notification.createMany({
      data: descriptors.map((descriptor) => ({
        recipientId: descriptor.recipientId,
        type: descriptor.type,
        title: descriptor.title,
        body: descriptor.body,
        orderId: descriptor.orderId
      }))
    });

    // Live-push to each recipient (best-effort, dedupe recipients).
    const recipients = [...new Set(descriptors.map((d) => d.recipientId))];
    await Promise.all(recipients.map((recipientId) => publishNotificationCreated(recipientId, requestId)));

    logger.info('notifications_created', {
      type: event.type,
      orderId: event.orderId,
      count: descriptors.length,
      requestId
    });

    return { created: descriptors.length };
  }
};
