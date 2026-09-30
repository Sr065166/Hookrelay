import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/AppError';

// Private/reserved IP ranges and loopback patterns for SSRF protection
const BLOCKED_HOSTNAMES = /^(localhost|.*\.local|.*\.internal)$/i;

// IPv4 private/loopback ranges
const PRIVATE_IPV4 =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|0\.)/;

// IPv6 loopback and link-local
const PRIVATE_IPV6 = /^(::1|fc00:|fd[0-9a-f]{2}:|fe80:)/i;

/**
 * Validate that a URL is not targeting private/internal infrastructure.
 * Throws BadRequestError if the URL is blocked.
 */
export function validateEndpointUrl(rawUrl: string, isProduction: boolean): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestError('Invalid URL format');
  }

  // Require HTTPS in production
  if (isProduction && parsed.protocol !== 'https:') {
    throw new BadRequestError('Endpoint URLs must use HTTPS in production');
  }

  // Block non-http(s) protocols entirely
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestError('Endpoint URLs must use HTTP or HTTPS');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and reserved names
  if (BLOCKED_HOSTNAMES.test(hostname)) {
    throw new BadRequestError(
      'Endpoint URL targets a restricted hostname (localhost, .local, .internal)',
    );
  }

  // Block private IPv4 ranges
  if (PRIVATE_IPV4.test(hostname)) {
    throw new BadRequestError('Endpoint URL targets a private or reserved IP address');
  }

  // Block IPv6 loopback/link-local
  // Strip surrounding brackets for IPv6 literals e.g. [::1]
  const ipv6Host = hostname.replace(/^\[/, '').replace(/\]$/, '');
  if (PRIVATE_IPV6.test(ipv6Host)) {
    throw new BadRequestError('Endpoint URL targets a private or reserved IPv6 address');
  }
}

/**
 * Express middleware that validates the `url` field in the request body.
 * Applied to endpoint creation and update routes.
 */
export function ssrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const url = req.body?.url;
  if (url && typeof url === 'string') {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      validateEndpointUrl(url, isProduction);
    } catch (err) {
      return next(err);
    }
  }
  next();
}
