"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPOSED_HTTP_HEADERS = exports.ALLOWED_HTTP_HEADERS = exports.ALLOWED_HTTP_METHODS = void 0;
exports.buildCorsOptions = buildCorsOptions;
exports.ALLOWED_HTTP_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
];
exports.ALLOWED_HTTP_HEADERS = [
    'Authorization',
    'Content-Type',
    'Accept',
    'X-Correlation-ID',
    'x-correlation-id',
    'Origin',
    'X-Requested-With',
];
exports.EXPOSED_HTTP_HEADERS = [
    'X-Correlation-ID',
    'x-correlation-id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
    'Content-Disposition',
];
function buildCorsOptions(options = {}) {
    const allowedOrigins = options.allowedOrigins && options.allowedOrigins.length > 0
        ? options.allowedOrigins.map((o) => o.trim().toLowerCase())
        : ['http://localhost:3000'];
    return {
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }
            const normalizedOrigin = origin.trim().toLowerCase();
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }
            return callback(new Error(`CORS origin '${origin}' is not authorized by SEG CRM CORS policy.`), false);
        },
        methods: exports.ALLOWED_HTTP_METHODS,
        allowedHeaders: exports.ALLOWED_HTTP_HEADERS,
        exposedHeaders: exports.EXPOSED_HTTP_HEADERS,
        credentials: true,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
}
//# sourceMappingURL=cors.config.js.map