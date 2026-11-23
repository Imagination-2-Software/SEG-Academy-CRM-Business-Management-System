"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var TokenStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStorageService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
let TokenStorageService = TokenStorageService_1 = class TokenStorageService {
    logger = new common_1.Logger(TokenStorageService_1.name);
    store = new Map();
    rateLimits = new Map();
    hashToken(token) {
        return crypto.createHash('sha256').update(token.trim()).digest('hex');
    }
    async storeToken(userId, tokenHash, purpose, expiresInMinutes) {
        for (const [hash, entry] of this.store.entries()) {
            if (entry.userId === userId && entry.purpose === purpose && !entry.used) {
                entry.used = true;
            }
        }
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        const entry = {
            userId,
            tokenHash,
            purpose,
            expiresAt,
            used: false,
            createdAt: new Date(),
        };
        this.store.set(tokenHash, entry);
        return entry;
    }
    async consumeToken(tokenHash, expectedPurpose) {
        const entry = this.store.get(tokenHash);
        if (!entry) {
            return null;
        }
        if (entry.purpose !== expectedPurpose) {
            return null;
        }
        if (entry.used) {
            this.logger.warn(`Attempted reuse of already-consumed token for user: ${entry.userId}`);
            return null;
        }
        if (entry.expiresAt.getTime() <= Date.now()) {
            this.logger.warn(`Attempted use of expired token for user: ${entry.userId}`);
            return null;
        }
        entry.used = true;
        return entry;
    }
    checkRateLimit(key, cooldownSeconds) {
        const now = Date.now();
        const lastTime = this.rateLimits.get(key);
        if (lastTime && now - lastTime < cooldownSeconds * 1000) {
            return false;
        }
        this.rateLimits.set(key, now);
        return true;
    }
    clear() {
        this.store.clear();
        this.rateLimits.clear();
    }
    clearRateLimits() {
        this.rateLimits.clear();
    }
    getEntry(tokenHash) {
        return this.store.get(tokenHash);
    }
};
exports.TokenStorageService = TokenStorageService;
exports.TokenStorageService = TokenStorageService = TokenStorageService_1 = __decorate([
    (0, common_1.Injectable)()
], TokenStorageService);
//# sourceMappingURL=token-storage.service.js.map