import { randomBytes } from 'crypto';
import { EndpointStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../errors/AppError';
import { validateEndpointUrl } from '../middleware/ssrf.middleware';
import type { CreateEndpointInput, UpdateEndpointInput } from '../validators/endpoint.validator';

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

export class EndpointService {
  static async listEndpoints(organizationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.endpoint.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          url: true,
          description: true,
          status: true,
          eventsSubscribed: true,
          timeoutMs: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.endpoint.count({ where: { organizationId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getEndpoint(organizationId: string, id: string) {
    const endpoint = await prisma.endpoint.findFirst({
      where: { id, organizationId },
    });
    if (!endpoint) throw new NotFoundError('Endpoint not found');
    return endpoint;
  }

  static async createEndpoint(organizationId: string, input: CreateEndpointInput) {
    validateEndpointUrl(input.url, process.env.NODE_ENV === 'production');
    const secret = generateSecret();
    return prisma.endpoint.create({
      data: {
        organizationId,
        url: input.url,
        description: input.description,
        eventsSubscribed: input.eventsSubscribed,
        timeoutMs: input.timeoutMs,
        secret,
      },
    });
  }

  static async updateEndpoint(organizationId: string, id: string, input: UpdateEndpointInput) {
    // Ensure endpoint belongs to this org
    const existing = await prisma.endpoint.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundError('Endpoint not found');

    if (input.url) {
      validateEndpointUrl(input.url, process.env.NODE_ENV === 'production');
    }

    return prisma.endpoint.update({
      where: { id },
      data: {
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.eventsSubscribed !== undefined
          ? { eventsSubscribed: input.eventsSubscribed }
          : {}),
        ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
        ...(input.status !== undefined ? { status: input.status as EndpointStatus } : {}),
      },
    });
  }

  static async deleteEndpoint(organizationId: string, id: string) {
    const existing = await prisma.endpoint.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundError('Endpoint not found');
    await prisma.endpoint.delete({ where: { id } });
  }
}
