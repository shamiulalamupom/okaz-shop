import { z } from 'zod';

export const addItemSchema = z
  .object({
    productId: z.string().trim().min(1, 'productId is required'),
    quantity: z.number().int().positive().max(1000).default(1)
  })
  .strict();

export const updateItemSchema = z
  .object({
    quantity: z.number().int().positive().max(1000)
  })
  .strict();
