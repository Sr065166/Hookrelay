export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export class HealthService {
  public static getHealth(): HealthCheckResult {
    return {
      status: 'ok',
      service: 'hookrelay-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
