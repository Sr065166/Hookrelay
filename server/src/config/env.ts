import dotenv from 'dotenv';
import path from 'path';

// Load .env from server dir first, then root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: requireEnv(
      'JWT_ACCESS_SECRET',
      'dev_access_secret_change_in_production_min64chars_aaaaaaaaaaaaaaaaaa',
    ),
    refreshSecret: requireEnv(
      'JWT_REFRESH_SECRET',
      'dev_refresh_secret_change_in_production_min64chars_bbbbbbbbbbbbbbbbb',
    ),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  isProduction: process.env.NODE_ENV === 'production',
};
