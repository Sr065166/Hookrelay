import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { createTestUserAndOrg } from './helpers';

describe('API Tests', () => {
  it('API-key authentication', async () => {
    const { org, rawApiKey } = await createTestUserAndOrg();

    // Missing key
    let res = await request(app).post('/api/v1/events').send({ eventType: 'test', payload: {} });
    expect(res.status).toBe(401);

    // Invalid key
    res = await request(app)
      .post('/api/v1/events')
      .set('x-api-key', 'invalid-key')
      .send({ eventType: 'test', payload: {} });
    expect(res.status).toBe(401);

    // Valid key
    res = await request(app)
      .post('/api/v1/events')
      .set('x-api-key', rawApiKey)
      .send({ eventType: 'test', payload: {} });
    expect(res.status).toBe(201);
  });

  it('Event idempotency', async () => {
    const { org, rawApiKey } = await createTestUserAndOrg();
    const idempotencyKey = 'idemp-123';

    const res1 = await request(app)
      .post('/api/v1/events')
      .set('x-api-key', rawApiKey)
      .send({ eventType: 'test', payload: { a: 1 }, idempotencyKey });
    expect(res1.status).toBe(201);
    const eventId1 = res1.body.id;

    const res2 = await request(app)
      .post('/api/v1/events')
      .set('x-api-key', rawApiKey)
      .send({ eventType: 'test', payload: { a: 1 }, idempotencyKey });
    expect(res2.status).toBe(200); // Idempotent response
    expect(res2.body.id).toBe(eventId1);
  });

  it('Tenant isolation', async () => {
    const tenant1 = await createTestUserAndOrg();
    const tenant2 = await createTestUserAndOrg();

    // Tenant 1 creates endpoint
    const resEp = await request(app)
      .post(`/api/v1/orgs/${tenant1.org.id}/endpoints`)
      .set('Authorization', `Bearer ${tenant1.token}`)
      .send({ url: 'http://example.com', eventsSubscribed: ['*'] });
    expect(resEp.status).toBe(201);

    // Tenant 2 tries to view Tenant 1's endpoint
    const resGet = await request(app)
      .get(`/api/v1/orgs/${tenant2.org.id}/endpoints/${resEp.body.id}`)
      .set('Authorization', `Bearer ${tenant2.token}`);
    expect(resGet.status).toBe(404);
  });

  it('RBAC', async () => {
    const viewerTenant = await createTestUserAndOrg('VIEWER');

    // VIEWER tries to create endpoint
    const resEp = await request(app)
      .post(`/api/v1/orgs/${viewerTenant.org.id}/endpoints`)
      .set('Authorization', `Bearer ${viewerTenant.token}`)
      .send({ url: 'http://example.com', eventsSubscribed: ['*'] });
    
    expect(resEp.status).toBe(403);
  });

  it('replay resets attemptsCount', async () => {
    const { org, token } = await createTestUserAndOrg();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: 'test',
        payload: {},
      }
    });

    const ep = await prisma.endpoint.create({
      data: {
        organizationId: org.id,
        url: 'http://example.com',
        eventsSubscribed: ['*'],
        secret: 'dummy',
      }
    });

    const delivery = await prisma.delivery.create({
      data: {
        eventId: event.id,
        endpointId: ep.id,
        status: 'FAILED',
        attemptsCount: 10,
      }
    });

    const res = await request(app)
      .post(`/api/v1/orgs/${org.id}/deliveries/${delivery.id}/replay`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);

    const updated = await prisma.delivery.findUnique({ where: { id: delivery.id } });
    expect(updated?.status).toBe('PENDING');
    expect(updated?.attemptsCount).toBe(0);
  });
});
