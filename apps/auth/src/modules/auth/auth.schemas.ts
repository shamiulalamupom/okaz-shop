// ../apps/auth/src/modules/auth/auth.schemas.ts

import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(320, 'Email must be at most 320 characters')
  .email()
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8)
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema
  })
  .strict();

export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema
  })
  .strict();

export const updateProfileSchema = z
  .object({
    avatarUrl: z.string().url().max(2048).optional(),
    avatarMediaId: z.string().trim().max(64).optional(),
    nom: z.string().trim().max(120).optional(),
    prenom: z.string().trim().max(120).optional()
  })
  .strict();
