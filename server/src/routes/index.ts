import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { endpointRouter } from './endpoint.routes';
import { eventIngestRouter, eventQueryRouter } from './event.routes';
import { deliveryRouter } from './delivery.routes';
import { apiKeyRouter } from './apiKey.routes';

export const routes = Router();

// Health — public
routes.use('/health', healthRouter);

// Auth — public (no auth middleware here; routes handle it individually)
routes.use('/v1/auth', authRouter);

// Event ingestion — API key authenticated
routes.use('/v1/events', eventIngestRouter);

// Organization-scoped resources — JWT + RBAC
routes.use('/v1/orgs/:orgId/endpoints', endpointRouter);
routes.use('/v1/orgs/:orgId/events', eventQueryRouter);
routes.use('/v1/orgs/:orgId/deliveries', deliveryRouter);
routes.use('/v1/orgs/:orgId/api-keys', apiKeyRouter);
