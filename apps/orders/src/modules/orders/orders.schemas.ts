import { z } from 'zod';

export const orderItemInputSchema = z
  .object({
    productId: z.string().trim().min(1, 'productId is required').max(64),
    storeId: z.string().trim().min(1, 'storeId is required').max(64),
    quantity: z.number().int().positive('quantity must be > 0').max(1000)
  })
  .strict();

export const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1, 'At least one item is required').max(50)
  })
  .strict();

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
