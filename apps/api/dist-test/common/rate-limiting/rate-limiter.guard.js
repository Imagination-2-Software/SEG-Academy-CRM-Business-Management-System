"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const rate_limit_decorator_1 = require("./rate-limit.decorator");
const rate_limiter_storage_service_1 = require("./rate-limiter-storage.service");
const client_ip_util_1 = require("./client-ip.util");
let RateLimiterGuard = class RateLimiterGuard {
    reflector;
    storage;
    configService;
    logger = new common_1.Logger('RateLimiter');
    defaultLimit;
    defaultTtl;
    trustProxy;
    constructor(reflector, storage, configService) {
        this.reflector = reflector;
        this.storage = storage;
        this.configService = configService;
        this.defaultLimit = parseInt(this.configService.get('THROTTLE_LIMIT') || '100', 10);
        this.defaultTtl = parseInt(this.configService.get('THROTTLE_TTL') || '60', 10);
        const trustProxyConfig = this.configService.get('TRUST_PROXY');
        this.trustProxy = trustProxyConfig === 'true' || trustProxyConfig === '1';
    }
    canActivate(context) {
        const isSkipped = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_SKIP_KEY, [context.getHandler(), context.getClass()]);
        if (isSkipped) {
            return true;
        }
        const customOptions = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        const limit = customOptions?.limit ?? this.defaultLimit;
        const ttlSeconds = customOptions?.ttlSeconds ?? this.defaultTtl;
        const ruleName = customOptions?.name ?? 'global';
        const keyPrefix = customOptions?.keyPrefix ?? 'rl';
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const clientIp = (0, client_ip_util_1.getClientIp)(req, { trustProxy: this.trustProxy });
        const correlationId = req.correlationId || '-';
        const rateLimitKey = `${keyPrefix}:${ruleName}:${clientIp}`;
        const result = this.storage.consume(rateLimitKey, limit, ttlSeconds);
        if (res && typeof res.setHeader === 'function') {
            res.setHeader('X-RateLimit-Limit', result.limit.toString());
            res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
            res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
        }
        if (!result.isAllowed) {
            if (res && typeof res.setHeader === 'function') {
                res.setHeader('Retry-After', result.retryAfterSeconds.toString());
            }
            this.logger.warn(`[${correlationId}] Rate limit exceeded for IP: ${clientIp} on [${req.method}] ${req.originalUrl || req.url} ` +
                `(Rule: ${ruleName}, Limit: ${limit}/${ttlSeconds}s, Retry-After: ${result.retryAfterSeconds}s)`);
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                error: 'Too Many Requests',
                message: `Too many requests. Please try again after ${result.retryAfterSeconds} seconds.`,
                retryAfter: result.retryAfterSeconds,
            }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
};
exports.RateLimiterGuard = RateLimiterGuard;
exports.RateLimiterGuard = RateLimiterGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        rate_limiter_storage_service_1.RateLimiterStorageService,
        config_1.ConfigService])
], RateLimiterGuard);
//# sourceMappingURL=rate-limiter.guard.js.map