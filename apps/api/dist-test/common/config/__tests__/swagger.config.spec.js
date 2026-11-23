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
const config_1 = require("@nestjs/config");
const swagger_config_1 = require("../swagger.config");
(0, node_test_1.describe)('Swagger / OpenAPI Configuration & Document Generation', () => {
    (0, node_test_1.test)('buildSwaggerConfig should define required metadata, tags, and JWT Bearer security scheme', () => {
        const config = (0, swagger_config_1.buildSwaggerConfig)();
        assert.equal(config.info.title, 'SEG Academy CRM API');
        assert.equal(config.info.version, '1.0.0');
        assert.ok(config.info.description?.includes('Enterprise Modular Monolith REST API Documentation'));
        assert.ok(config.info.description?.includes('Standard Envelopes'));
        assert.ok(config.info.description?.includes('Correlation Tracking'));
        assert.ok(config.components?.securitySchemes?.['bearer-jwt']);
        const jwtScheme = config.components.securitySchemes['bearer-jwt'];
        assert.equal(jwtScheme.type, 'http');
        assert.equal(jwtScheme.scheme, 'bearer');
        assert.equal(jwtScheme.bearerFormat, 'JWT');
        const tagNames = config.tags?.map((t) => t.name) || [];
        assert.ok(tagNames.includes('System'));
        assert.ok(tagNames.includes('Authentication'));
        assert.ok(tagNames.includes('User Management'));
        assert.ok(tagNames.includes('Roles Management'));
        assert.ok(tagNames.includes('Test / Diagnostic Endpoints'));
    });
    (0, node_test_1.test)('setupSwagger should honor SWAGGER_ENABLED=false in production', () => {
        const mockConfigService = new config_1.ConfigService({
            NODE_ENV: 'production',
            SWAGGER_ENABLED: 'false',
        });
        const mockApp = {
            get: (service) => {
                if (service === config_1.ConfigService)
                    return mockConfigService;
                return undefined;
            },
        };
        const document = (0, swagger_config_1.setupSwagger)(mockApp);
        assert.equal(document, null, 'Swagger should return null when SWAGGER_ENABLED=false in production');
    });
    (0, node_test_1.test)('setupSwagger should be enabled in development by default', () => {
        const mockConfigService = new config_1.ConfigService({
            NODE_ENV: 'development',
            SWAGGER_ENABLED: 'true',
        });
        let swaggerSetupCalled = false;
        const mockApp = {
            get: (service) => {
                if (service === config_1.ConfigService)
                    return mockConfigService;
                return undefined;
            },
            getHttpAdapter: () => ({
                getType: () => 'express',
            }),
        };
        const config = (0, swagger_config_1.buildSwaggerConfig)();
        assert.ok(config.info.title === 'SEG Academy CRM API');
    });
});
//# sourceMappingURL=swagger.config.spec.js.map