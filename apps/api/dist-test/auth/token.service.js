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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let TokenService = class TokenService {
    configService;
    jwtSecret;
    jwtExpiresInSeconds;
    refreshExpiresInDays;
    constructor(configService) {
        this.configService = configService;
        const secret = this.configService.get('JWT_SECRET');
        if (!secret || secret.length < 32) {
            throw new Error('FATAL: JWT_SECRET must be configured in environment and must be at least 32 characters long.');
        }
        this.jwtSecret = secret;
        const rawExp = this.configService.get('JWT_EXPIRES_IN') || '15m';
        this.jwtExpiresInSeconds = this.parseDurationToSeconds(rawExp, 900);
        const rawRefreshExp = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d';
        this.refreshExpiresInDays = Math.max(1, Math.floor(this.parseDurationToSeconds(rawRefreshExp, 30 * 86400) / 86400));
    }
    signAccessToken(payload) {
        const header = { alg: 'HS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const fullPayload = {
            ...payload,
            iat: now,
            exp: now + this.jwtExpiresInSeconds,
        };
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
        const signature = crypto
            .createHmac('sha256', this.jwtSecret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64');
        const encodedSignature = this.base64ToBase64Url(signature);
        return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    }
    verifyAccessToken(token) {
        if (!token || typeof token !== 'string') {
            throw new common_1.UnauthorizedException('Invalid or missing authentication token.');
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new common_1.UnauthorizedException('Malformed authentication token structure.');
        }
        const [encodedHeader, encodedPayload, encodedSignature] = parts;
        const expectedSigRaw = crypto
            .createHmac('sha256', this.jwtSecret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64');
        const expectedSignature = this.base64ToBase64Url(expectedSigRaw);
        const sigBuffer = Buffer.from(encodedSignature, 'utf8');
        const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
        if (sigBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            throw new common_1.UnauthorizedException('Invalid token signature.');
        }
        let payload;
        try {
            payload = JSON.parse(this.base64UrlDecode(encodedPayload));
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token payload encoding.');
        }
        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp <= now) {
            throw new common_1.UnauthorizedException('Token has expired.');
        }
        return payload;
    }
    getRefreshTokenExpiryDate() {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);
        return expiresAt;
    }
    getAccessTokenTtlSeconds() {
        return this.jwtExpiresInSeconds;
    }
    base64UrlEncode(str) {
        return Buffer.from(str, 'utf8')
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }
    base64ToBase64Url(base64) {
        return base64
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }
    base64UrlDecode(base64Url) {
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return Buffer.from(base64, 'base64').toString('utf8');
    }
    parseDurationToSeconds(duration, defaultSeconds) {
        if (!duration || typeof duration !== 'string')
            return defaultSeconds;
        const trimmed = duration.trim().toLowerCase();
        const match = trimmed.match(/^(\d+)([smhd])?$/);
        if (!match)
            return defaultSeconds;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 3600;
            case 'd': return value * 86400;
            default: return value;
        }
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map