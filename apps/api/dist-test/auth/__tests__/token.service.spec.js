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
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const common_1 = require("@nestjs/common");
const token_service_1 = require("../token.service");
(0, node_test_1.describe)('TokenService Unit Tests', () => {
    const mockConfigService = {
        get: (key) => {
            if (key === 'JWT_SECRET')
                return 'test-super-secret-key-at-least-32-chars-long!';
            if (key === 'JWT_EXPIRES_IN')
                return '15m';
            if (key === 'JWT_REFRESH_EXPIRES_IN')
                return '30d';
            return null;
        },
    };
    const tokenService = new token_service_1.TokenService(mockConfigService);
    (0, node_test_1.it)('should sign and verify valid JWT access tokens with correct payload', () => {
        const payload = {
            sub: 'user-uuid-1234',
            email: 'admin@segacademy.com',
            roleCode: 'ADMIN',
            fullName: 'System Administrator',
            employeeId: 'emp-uuid-5678',
        };
        const token = tokenService.signAccessToken(payload);
        assert.ok(typeof token === 'string');
        assert.equal(token.split('.').length, 3, 'JWT must contain header, payload, and signature');
        const decoded = tokenService.verifyAccessToken(token);
        assert.equal(decoded.sub, payload.sub);
        assert.equal(decoded.email, payload.email);
        assert.equal(decoded.roleCode, payload.roleCode);
        assert.equal(decoded.fullName, payload.fullName);
        assert.equal(decoded.employeeId, payload.employeeId);
        assert.ok(decoded.exp > decoded.iat, 'exp must be greater than iat');
    });
    (0, node_test_1.it)('should reject tampered or modified JWT tokens', () => {
        const payload = {
            sub: 'user-uuid-1234',
            email: 'admin@segacademy.com',
            roleCode: 'ADMIN',
            fullName: 'System Administrator',
        };
        const token = tokenService.signAccessToken(payload);
        const parts = token.split('.');
        const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, roleCode: 'FOUNDER_SUPER_ADMIN' }))
            .toString('base64')
            .replace(/=/g, '');
        const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
        assert.throws(() => tokenService.verifyAccessToken(tamperedToken), (err) => err instanceof common_1.UnauthorizedException, 'Tampered token signature must throw UnauthorizedException');
    });
    (0, node_test_1.it)('should reject tokens with invalid secrets', () => {
        const payload = {
            sub: 'user-uuid-1234',
            email: 'admin@segacademy.com',
            roleCode: 'ADMIN',
            fullName: 'System Administrator',
        };
        const token = tokenService.signAccessToken(payload);
        const otherConfigService = {
            get: (key) => {
                if (key === 'JWT_SECRET')
                    return 'different-secret-key-that-does-not-match-32!';
                return '15m';
            },
        };
        const otherTokenService = new token_service_1.TokenService(otherConfigService);
        assert.throws(() => otherTokenService.verifyAccessToken(token), (err) => err instanceof common_1.UnauthorizedException);
    });
    (0, node_test_1.it)('should calculate refresh token expiry in future', () => {
        const expiry = tokenService.getRefreshTokenExpiryDate();
        const now = new Date();
        assert.ok(expiry.getTime() > now.getTime(), 'Expiry date must be in the future');
        const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 86400));
        assert.equal(diffDays, 30, 'Expiry should be 30 days ahead');
    });
});
//# sourceMappingURL=token.service.spec.js.map