import { Request } from 'express';

export interface ClientIpExtractionOptions {
  /**
   * Whether to trust proxy headers (e.g. X-Forwarded-For).
   * Default should be FALSE unless explicitly enabled by configuration in trusted environments (e.g. behind Nginx).
   */
  trustProxy?: boolean;
}

/**
 * Safely extracts client IP address from an Express request.
 * Prevents IP spoofing via arbitrary X-Forwarded-For headers unless trustProxy is explicitly true.
 */
export function getClientIp(req: Request, options: ClientIpExtractionOptions = {}): string {
  const { trustProxy = false } = options;

  if (trustProxy) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const headerVal = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      // In X-Forwarded-For: client, proxy1, proxy2...
      // The leftmost non-empty address is the client IP.
      const firstIp = headerVal.split(',')[0]?.trim();
      if (firstIp && isValidIpAddress(firstIp)) {
        return sanitizeIp(firstIp);
      }
    }

    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      const realIp = (Array.isArray(xRealIp) ? xRealIp[0] : xRealIp).trim();
      if (isValidIpAddress(realIp)) {
        return sanitizeIp(realIp);
      }
    }
  }

  // Direct socket IP or req.ip (populated by Express if app.set('trust proxy', ...) is enabled)
  const directIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return sanitizeIp(directIp);
}

/**
 * Basic IP address format validation (IPv4 or IPv6).
 */
function isValidIpAddress(ip: string): boolean {
  // Simple check for valid IPv4 or IPv6 structure without malicious characters
  const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const ipv6Pattern = /^[a-fA-F0-9:]+$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Normalizes IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
 */
function sanitizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip.trim();
}
