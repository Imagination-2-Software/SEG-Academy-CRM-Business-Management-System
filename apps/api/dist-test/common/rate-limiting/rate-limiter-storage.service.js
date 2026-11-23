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
var RateLimiterStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterStorageService = void 0;
const common_1 = require("@nestjs/common");
let RateLimiterStorageService = RateLimiterStorageService_1 = class RateLimiterStorageService {
    logger = new common_1.Logger(RateLimiterStorageService_1.name);
    store = new Map();
    cleanupTimer = null;
    constructor() {
        this.cleanupTimer = setInterval(() => this.cleanupExpired(), 60000);
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
    consume(key, limit, ttlSeconds) {
        const now = Date.now();
        const windowMs = ttlSeconds * 1000;
        let record = this.store.get(key);
        if (!record || now >= record.resetTime) {
            const resetTime = now + windowMs;
            record = { count: 1, resetTime };
            this.store.set(key, record);
            return {
                isAllowed: true,
                limit,
                remaining: Math.max(0, limit - 1),
                resetTime,
                retryAfterSeconds: Math.ceil(windowMs / 1000),
            };
        }
        record.count += 1;
        const retryAfterMs = Math.max(0, record.resetTime - now);
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
        if (record.count > limit) {
            return {
                isAllowed: false,
                limit,
                remaining: 0,
                resetTime: record.resetTime,
                retryAfterSeconds,
            };
        }
        return {
            isAllowed: true,
            limit,
            remaining: Math.max(0, limit - record.count),
            resetTime: record.resetTime,
            retryAfterSeconds,
        };
    }
    reset(key) {
        this.store.delete(key);
    }
    cleanupExpired() {
        const now = Date.now();
        let purged = 0;
        for (const [key, record] of this.store.entries()) {
            if (now >= record.resetTime) {
                this.store.delete(key);
                purged++;
            }
        }
        if (purged > 0) {
            this.logger.debug(`Purged ${purged} expired rate-limit records.`);
        }
    }
    get size() {
        return this.store.size;
    }
    clear() {
        this.store.clear();
    }
    onDestroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
};
exports.RateLimiterStorageService = RateLimiterStorageService;
exports.RateLimiterStorageService = RateLimiterStorageService = RateLimiterStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RateLimiterStorageService);
//# sourceMappingURL=rate-limiter-storage.service.js.map