import { z } from 'zod';

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)),
});

export const createEventSchema = z.object({
  eventType: z.string().min(1, 'eventType is required').max(100),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(1).max(255).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
