import { z } from 'zod';

export const createStoreSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    city: z.string().trim().min(1).max(120).optional()
  })
  .strict();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
