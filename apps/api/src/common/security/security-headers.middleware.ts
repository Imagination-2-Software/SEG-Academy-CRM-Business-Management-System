import { Request, Response, NextFunction } from 'express';

export interface SecurityHeadersOptions {
  /**
   * Environment name: 'development' | 'production' | 'staging' | 'test'
   */
  isProduction?: boolean;

  /**
   * Content-Security-Policy custom directives or false to disable CSP.
   */
  contentSecurityPolicy?: boolean | Record<string, string[]>;
}

/**
 * Builds standard Content Security Policy directives compatible with Swagger UI and API consumers.
 */
function buildCspHeader(): string {
  return [
    "default-src 'self'",
    // Swagger UI requires inline styles and unpkg/cdn script assets if loaded, plus self
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: validator.swagger.io",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Enterprise HTTP Security Headers Middleware.
 * Provides OWASP-recommended HTTP security headers natively:
 * - Content-Security-Policy (CSP) tailored for REST API and Swagger UI
 * - Strict-Transport-Security (HSTS) in production
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY (anti-clickjacking)
 * - X-XSS-Protection: 0 (OWASP modern standard: disable legacy buggy reflective filter)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: camera=(), microphone=(), geolocation=()
 * - Cross-Origin-Opener-Policy (COOP): same-origin
 * - Cross-Origin-Resource-Policy (CORP): cross-origin (allows API consumers and Swagger assets)
 */
export function securityHeadersMiddleware(options: SecurityHeadersOptions = {}) {
  const isProduction = options.isProduction ?? (process.env.NODE_ENV === 'production');

  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 2. Prevent clickjacking / frame embedding
    res.setHeader('X-Frame-Options', 'DENY');

    // 3. Disable legacy buggy IE/Chrome reflective XSS filter in favor of CSP
    res.setHeader('X-XSS-Protection', '0');

    // 4. Protect referrer information across origins
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 5. Restrict sensitive browser permissions/features
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    // 6. Cross-Origin Policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // 7. Content Security Policy (allows Swagger UI inline styles/scripts without breaking)
    if (options.contentSecurityPolicy !== false) {
      res.setHeader('Content-Security-Policy', buildCspHeader());
    }

    // 8. Strict-Transport-Security (HSTS) - Only in Production over HTTPS
    if (isProduction) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    next();
  };
}
