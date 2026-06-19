import { z } from 'zod';

export const upsertStockSchema = z
  .object({
    productId: z.string().trim().min(1, 'productId is required').max(64),
    storeId: z.string().trim().min(1, 'storeId is required').max(64),
    quantity: z.number().int().min(0, 'quantity must be >= 0')
  })
  .strict();

export const adjustStockSchema = z
  .object({
    productId: z.string().trim().min(1).max(64),
    storeId: z.string().trim().min(1).max(64),
    delta: z.number().int()
  })
  .strict();

export const reservationItemSchema = z
  .object({
    productId: z.string().trim().min(1).max(64),
    storeId: z.string().trim().min(1).max(64),
    quantity: z.number().int().positive('quantity must be > 0')
  })
  .strict();

export const reservationSchema = z
  .object({
    items: z.array(reservationItemSchema).min(1, 'At least one item is required')
  })
  .strict();

export type UpsertStockInput = z.infer<typeof upsertStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ReservationItem = z.infer<typeof reservationItemSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
