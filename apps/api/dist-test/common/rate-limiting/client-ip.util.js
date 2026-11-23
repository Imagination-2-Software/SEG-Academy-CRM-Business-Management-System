"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
function getClientIp(req, options = {}) {
    const { trustProxy = false } = options;
    if (trustProxy) {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (xForwardedFor) {
            const headerVal = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
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
    const directIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return sanitizeIp(directIp);
}
function isValidIpAddress(ip) {
    const ipv4Pattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Pattern = /^[a-fA-F0-9:]+$/;
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}
function sanitizeIp(ip) {
    if (ip.startsWith('::ffff:')) {
        return ip.replace('::ffff:', '');
    }
    return ip.trim();
}
//# sourceMappingURL=client-ip.util.js.map