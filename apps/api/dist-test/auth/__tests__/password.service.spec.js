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
const password_service_1 = require("../password.service");
(0, node_test_1.describe)('PasswordService Unit Tests', () => {
    const service = new password_service_1.PasswordService();
    (0, node_test_1.it)('should hash password using Argon2id format ($argon2id$...) with OWASP parameters', async () => {
        const password = 'SuperSecurePassword2026!';
        const hash = await service.hashPassword(password);
        assert.ok(hash.startsWith('$argon2id$'), 'Hash should start with $argon2id$');
        assert.ok(hash.includes('m=65536'), 'Memory cost should be 64MB (65536 KiB)');
        assert.ok(hash.includes('t=3'), 'Time cost should be 3 iterations');
        assert.ok(hash.includes('p=4'), 'Parallelism should be 4 threads');
        assert.notEqual(hash, password);
    });
    (0, node_test_1.it)('should successfully verify correct password against Argon2id hash', async () => {
        const password = 'CorrectPassword123#';
        const hash = await service.hashPassword(password);
        const isValid = await service.verifyPassword(hash, password);
        assert.equal(isValid, true, 'Valid password must return true');
    });
    (0, node_test_1.it)('should reject incorrect password', async () => {
        const password = 'CorrectPassword123#';
        const hash = await service.hashPassword(password);
        const isInvalid = await service.verifyPassword(hash, 'WrongPassword456!');
        assert.equal(isInvalid, false, 'Invalid password must return false');
    });
    (0, node_test_1.it)('should handle malformed or empty inputs gracefully without throwing uncaught exceptions', async () => {
        assert.equal(await service.verifyPassword('', 'somepass'), false);
        assert.equal(await service.verifyPassword('invalid-hash', 'somepass'), false);
        assert.equal(await service.verifyPassword('$argon2id$malformed', 'somepass'), false);
        await assert.rejects(async () => service.hashPassword(''), /Password must be a non-empty string/);
    });
    (0, node_test_1.it)('should generate cryptographically random 32-byte hex refresh tokens', () => {
        const token1 = service.generateRandomToken(32);
        const token2 = service.generateRandomToken(32);
        assert.equal(typeof token1, 'string');
        assert.equal(token1.length, 64, '32 bytes in hex format is 64 characters');
        assert.notEqual(token1, token2, 'Two generated tokens must be completely distinct');
    });
    (0, node_test_1.it)('should hash tokens deterministically using SHA-256', () => {
        const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const hash1 = service.hashToken(token);
        const hash2 = service.hashToken(token);
        assert.equal(hash1, hash2, 'SHA-256 hash must be deterministic');
        assert.equal(hash1.length, 64, 'SHA-256 hex digest is 64 chars');
        assert.notEqual(hash1, token, 'Hash must not equal plaintext token');
    });
});
//# sourceMappingURL=password.service.spec.js.map