import { z } from 'zod';

export const createStoreSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    city: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

// Edit a store. City may be cleared by sending an empty string.
export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    city: z.string().trim().max(120).optional()
  })
  .strict();

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
