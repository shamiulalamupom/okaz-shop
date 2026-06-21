import { z } from 'zod';

/**
 * Order lifecycle event ingested from the orders service. The notifications
 * service owns the policy: who gets notified, the copy, and the exclude-actor rule.
 */
export const orderEventSchema = z
  .object({
    type: z.enum(['order.placed', 'order.validated', 'order.rejected', 'order.delivered']),
    orderId: z.string().trim().min(1).max(64),
    customerId: z.string().trim().min(1).max(64),
    actorId: z.string().trim().min(1).max(64),
    total: z.number().nonnegative().optional()
  })
  .strict();

export type OrderEventInput = z.infer<typeof orderEventSchema>;
