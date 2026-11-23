import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export interface CorsConfigOptions {
  allowedOrigins?: string[];
  isProduction?: boolean;
}

/**
 * Standard HTTP methods allowed by the SEG CRM API.
 */
export const ALLOWED_HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/**
 * Standard HTTP headers allowed in incoming requests.
 */
export const ALLOWED_HTTP_HEADERS = [
  'Authorization',
  'Content-Type',
  'Accept',
  'X-Correlation-ID',
  'x-correlation-id',
  'Origin',
  'X-Requested-With',
];

/**
 * Standard HTTP headers exposed to client applications in responses.
 */
export const EXPOSED_HTTP_HEADERS = [
  'X-Correlation-ID',
  'x-correlation-id',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Retry-After',
  'Content-Disposition',
];

/**
 * Builds a strict, enterprise-ready CORS configuration for NestJS Express.
 *
 * Requirements:
 * 1. Explicit environment-based allowed origins (never wildcard '*' when credentials: true).
 * 2. Origin validation function safely matches against configured origins.
 * 3. Supports same-origin requests (e.g. mobile apps, curl, server-to-server with undefined origin).
 * 4. Preflight OPTIONS caching (`maxAge: 86400` = 24 hours).
 * 5. Rejects untrusted origins by passing an error or false.
 */
export function buildCorsOptions(options: CorsConfigOptions = {}): CorsOptions {
  const allowedOrigins = options.allowedOrigins && options.allowedOrigins.length > 0
    ? options.allowedOrigins.map((o) => o.trim().toLowerCase())
    : ['http://localhost:3000'];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile apps, Postman, curl, internal server-side calls)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().toLowerCase();

      // Check if origin exactly matches configured allowed origins
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Origin rejected
      return callback(
        new Error(`CORS origin '${origin}' is not authorized by SEG CRM CORS policy.`),
        false,
      );
    },
    methods: ALLOWED_HTTP_METHODS,
    allowedHeaders: ALLOWED_HTTP_HEADERS,
    exposedHeaders: EXPOSED_HTTP_HEADERS,
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}
