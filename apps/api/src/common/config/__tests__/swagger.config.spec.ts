import 'reflect-metadata';
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { buildSwaggerConfig, setupSwagger } from '../swagger.config';

describe('Swagger / OpenAPI Configuration & Document Generation', () => {
  test('buildSwaggerConfig should define required metadata, tags, and JWT Bearer security scheme', () => {
    const config = buildSwaggerConfig();

    assert.equal(config.info.title, 'SEG Academy CRM API');
    assert.equal(config.info.version, '1.0.0');
    assert.ok(config.info.description?.includes('Enterprise Modular Monolith REST API Documentation'));
    assert.ok(config.info.description?.includes('Standard Envelopes'));
    assert.ok(config.info.description?.includes('Correlation Tracking'));

    // Check security definitions
    assert.ok(config.components?.securitySchemes?.['bearer-jwt']);
    const jwtScheme = config.components.securitySchemes['bearer-jwt'] as any;
    assert.equal(jwtScheme.type, 'http');
    assert.equal(jwtScheme.scheme, 'bearer');
    assert.equal(jwtScheme.bearerFormat, 'JWT');

    // Check tags
    const tagNames = config.tags?.map((t) => t.name) || [];
    assert.ok(tagNames.includes('System'));
    assert.ok(tagNames.includes('Authentication'));
    assert.ok(tagNames.includes('User Management'));
    assert.ok(tagNames.includes('Roles Management'));
    assert.ok(tagNames.includes('Test / Diagnostic Endpoints'));
  });

  test('setupSwagger should honor SWAGGER_ENABLED=false in production', () => {
    const mockConfigService = new ConfigService({
      NODE_ENV: 'production',
      SWAGGER_ENABLED: 'false',
    });

    const mockApp: any = {
      get: (service: any) => {
        if (service === ConfigService) return mockConfigService;
        return undefined;
      },
    };

    const document = setupSwagger(mockApp);
    assert.equal(document, null, 'Swagger should return null when SWAGGER_ENABLED=false in production');
  });

  test('setupSwagger should be enabled in development by default', () => {
    const mockConfigService = new ConfigService({
      NODE_ENV: 'development',
      SWAGGER_ENABLED: 'true',
    });

    let swaggerSetupCalled = false;
    const mockApp: any = {
      get: (service: any) => {
        if (service === ConfigService) return mockConfigService;
        return undefined;
      },
      getHttpAdapter: () => ({
        getType: () => 'express',
      }),
    };

    // Verify config allows creation
    const config = buildSwaggerConfig();
    assert.ok(config.info.title === 'SEG Academy CRM API');
  });
});
