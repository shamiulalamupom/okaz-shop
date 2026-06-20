import { z } from 'zod';

export const MEDIA_PURPOSES = ['PRODUCT_IMAGE', 'PROFILE_IMAGE'] as const;

export const createUploadSchema = z
  .object({
    purpose: z.enum(MEDIA_PURPOSES),
    contentType: z.string().trim().min(1).max(100),
    fileSize: z.number().int().positive(),
    fileName: z.string().trim().min(1).max(255).optional(),
    linkedId: z.string().trim().min(1).max(64).optional()
  })
  .strict();

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
