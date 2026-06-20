import { z } from 'zod';

export const createAddressSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    line1: z.string().trim().min(1, 'Address line is required').max(200),
    city: z.string().trim().min(1, 'City is required').max(120),
    postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
    country: z.string().trim().min(1, 'Country is required').max(80)
  })
  .strict();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
