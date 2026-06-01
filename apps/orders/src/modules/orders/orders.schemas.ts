import { z } from 'zod';

export const confirmPaymentSchema = z
  .object({
    outcome: z.enum(['success', 'failure']).default('success')
  })
  .strict();
