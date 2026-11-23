import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

/**
 * Builds the Swagger / OpenAPI specification document for SEG CRM.
 */
export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('SEG Academy CRM API')
    .setDescription(
      'Enterprise Modular Monolith REST API Documentation for SEG Academy CRM.\n\n' +
        '### Architecture & Conventions\n' +
        '- **Standard Envelopes**: All successful responses return `{ success: true, statusCode, message, data, timestamp, path, correlationId }`.\n' +
        '- **Error Envelopes**: All error responses return `{ success: false, statusCode, message, error, timestamp, path, correlationId }`.\n' +
        '- **Correlation Tracking**: Client callers may pass `X-Correlation-ID` header; otherwise a UUIDv4 is assigned and returned in headers.\n' +
        '- **Authentication**: Protected endpoints require standard `Bearer <access_token>` in the `Authorization` header.\n' +
        '- **Rate Limiting**: Throttled endpoints return standard `X-RateLimit-*` and `Retry-After` headers with HTTP 429 upon exhaustion.\n',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token (e.g. Bearer eyJhbGciOi...)',
        in: 'header',
      },
      'bearer-jwt',
    )
    .addTag('System', 'System status, health probes, and application liveness')
    .addTag('Authentication', 'Session tokens, Argon2id authentication, token rotation, and password reset')
    .addTag('User Management', 'Administrative user administration, roles, statuses, and profiles')
    .addTag('Roles Management', 'System role querying and permission matrices')
    .addTag('Test / Diagnostic Endpoints', 'Access control and guard diagnostic endpoints')
    .build();
}

/**
 * Initializes Swagger UI on the NestJS application if enabled in environment configuration.
 * Disabled by default in production unless SWAGGER_ENABLED=true.
 */
export function setupSwagger(app: INestApplication): OpenAPIObject | null {
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const swaggerEnabledConfig = configService.get<string>('SWAGGER_ENABLED');

  // Allow swagger if explicitly true, or if in development/test/staging unless explicitly false
  const isEnabled =
    swaggerEnabledConfig === 'true' ||
    (swaggerEnabledConfig !== 'false' && nodeEnv !== 'production');

  if (!isEnabled) {
    return null;
  }

  const config = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
    customSiteTitle: 'SEG Academy CRM API Docs',
  });

  return document;
}
