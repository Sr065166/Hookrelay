import { prisma } from '../config/database';
import { ConflictError, NotFoundError, BadRequestError } from '../errors/AppError';
import type { CreateEventInput } from '../validators/event.validator';

export class EventService {
  /**
   * Ingest an event and fan out deliveries to all matching active endpoints.
   * Idempotency: if an event with the same (orgId, idempotencyKey) exists,
   * return it without re-creating.
   * All inserts happen in a single Prisma transaction.
   */
  static async createEvent(organizationId: string, input: CreateEventInput) {
    const { eventType, payload, idempotencyKey } = input;

    // Idempotency check
    if (idempotencyKey) {
      const existing = await prisma.event.findUnique({
        where: {
          organizationId_idempotencyKey: { organizationId, idempotencyKey },
        },
        include: { deliveries: true },
      });
      if (existing) {
        return { event: existing, deliveries: existing.deliveries, idempotent: true };
      }
    }

    // Find all active endpoints that should receive this event
    const endpoints = await prisma.endpoint.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      select: { id: true, eventsSubscribed: true },
    });

    // Filter by subscription: '*' matches all, otherwise must include eventType
    const matchingEndpoints = endpoints.filter(
      (ep) => ep.eventsSubscribed.includes('*') || ep.eventsSubscribed.includes(eventType),
    );

    // Transaction: create event + deliveries atomically
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          organizationId,
          eventType,
          payload: payload as any,
          idempotencyKey,
        },
      });

      const deliveries =
        matchingEndpoints.length > 0
          ? await tx.delivery.createManyAndReturn({
              data: matchingEndpoints.map((ep) => ({
                eventId: event.id,
                endpointId: ep.id,
                status: 'PENDING' as const,
              })),
            })
          : [];

      return { event, deliveries };
    });

    return { ...result, idempotent: false };
  }

  /**
   * List events for an organization with pagination.
   */
  static async listEvents(organizationId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          eventType: true,
          payload: true,
          idempotencyKey: true,
          createdAt: true,
          _count: { select: { deliveries: true } },
        },
      }),
      prisma.event.count({ where: { organizationId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * List deliveries for an organization with optional filters.
   */
  static async listDeliveries(
    organizationId: string,
    page: number,
    limit: number,
    filters: { status?: string; endpointId?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      event: { organizationId },
      ...(filters.status ? { status: filters.status as 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'FAILED' } : {}),
      ...(filters.endpointId ? { endpointId: filters.endpointId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          event: { select: { id: true, eventType: true, createdAt: true } },
          endpoint: { select: { id: true, url: true } },
        },
      }),
      prisma.delivery.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Manually replay a delivery by resetting it to PENDING.
   */
  static async replayDelivery(organizationId: string, deliveryId: string) {
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        event: { organizationId },
      },
    });

    if (!delivery) {
      throw new NotFoundError('Delivery not found');
    }

    if (delivery.status !== 'FAILED') {
      throw new BadRequestError('Only FAILED deliveries can be replayed');
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING',
        attemptsCount: 0,
        nextRetryAt: new Date(),
        lockedAt: null,
      },
    });
  }
}

// Re-export ConflictError to keep imports clean
export { ConflictError };
