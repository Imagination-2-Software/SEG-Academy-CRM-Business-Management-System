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
require("reflect-metadata");
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
const env_validation_1 = require("../env.validation");
(0, node_test_1.describe)('Environment Configuration Validation Unit Tests', () => {
    const validConfig = {
        NODE_ENV: 'development',
        PORT: '4000',
        CORS_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/seg_crm_staging',
        DIRECT_URL: 'postgresql://postgres:secret@localhost:5432/seg_crm_staging',
        JWT_SECRET: 'test-super-secret-key-at-least-32-chars-long!',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret-key-32-chars-min!',
        JWT_REFRESH_EXPIRES_IN: '30d',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
    };
    (0, node_test_1.it)('1. Passes validation with complete, valid environment configuration', () => {
        const validated = (0, env_validation_1.validateEnvironment)(validConfig);
        assert.equal(validated.PORT, 4000);
        assert.equal(validated.NODE_ENV, 'development');
        assert.equal(validated.JWT_SECRET, 'test-super-secret-key-at-least-32-chars-long!');
    });
    (0, node_test_1.it)('2. Fails when DATABASE_URL is missing', () => {
        const invalid = { ...validConfig };
        delete invalid.DATABASE_URL;
        assert.throws(() => (0, env_validation_1.validateEnvironment)(invalid), (err) => err.message.includes('DATABASE_URL is required'));
    });
    (0, node_test_1.it)('3. Fails when DATABASE_URL is not a PostgreSQL URI', () => {
        const invalid = {
            ...validConfig,
            DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
        };
        assert.throws(() => (0, env_validation_1.validateEnvironment)(invalid), (err) => err.message.includes('DATABASE_URL must be a valid PostgreSQL connection URI'));
    });
    (0, node_test_1.it)('4. Fails when JWT_SECRET is less than 32 characters (cryptographic strength requirement)', () => {
        const invalid = {
            ...validConfig,
            JWT_SECRET: 'short-secret-123',
        };
        assert.throws(() => (0, env_validation_1.validateEnvironment)(invalid), (err) => err.message.includes('JWT_SECRET must be at least 32 characters long'));
    });
    (0, node_test_1.it)('5. Never exposes secret values in validation error messages', () => {
        const invalid = {
            ...validConfig,
            NODE_ENV: 'invalid_env_name',
        };
        try {
            (0, env_validation_1.validateEnvironment)(invalid);
            assert.fail('Should have thrown validation error');
        }
        catch (err) {
            assert.match(err.message, /NODE_ENV must be one of/);
            assert.equal(err.message.includes(validConfig.JWT_SECRET), false);
            assert.equal(err.message.includes('secret@localhost:5432'), false);
        }
    });
    (0, node_test_1.it)('6. Coerces numeric PORT from string cleanly', () => {
        const configWithStrPort = { ...validConfig, PORT: '8080' };
        const validated = (0, env_validation_1.validateEnvironment)(configWithStrPort);
        assert.equal(typeof validated.PORT, 'number');
        assert.equal(validated.PORT, 8080);
    });
});
//# sourceMappingURL=env.validation.spec.js.map