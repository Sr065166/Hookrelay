import { z } from 'zod';

export const createEndpointSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  description: z.string().max(500).optional(),
  eventsSubscribed: z.array(z.string().min(1)).default(['*']),
  timeoutMs: z.number().int().min(1000).max(30000).default(10000),
});

export const updateEndpointSchema = z.object({
  url: z.string().url('Must be a valid URL').optional(),
  description: z.string().max(500).nullable().optional(),
  eventsSubscribed: z.array(z.string().min(1)).optional(),
  timeoutMs: z.number().int().min(1000).max(30000).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
