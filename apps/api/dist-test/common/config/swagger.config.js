"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSwaggerConfig = buildSwaggerConfig;
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
function buildSwaggerConfig() {
    return new swagger_1.DocumentBuilder()
        .setTitle('SEG Academy CRM API')
        .setDescription('Enterprise Modular Monolith REST API Documentation for SEG Academy CRM.\n\n' +
        '### Architecture & Conventions\n' +
        '- **Standard Envelopes**: All successful responses return `{ success: true, statusCode, message, data, timestamp, path, correlationId }`.\n' +
        '- **Error Envelopes**: All error responses return `{ success: false, statusCode, message, error, timestamp, path, correlationId }`.\n' +
        '- **Correlation Tracking**: Client callers may pass `X-Correlation-ID` header; otherwise a UUIDv4 is assigned and returned in headers.\n' +
        '- **Authentication**: Protected endpoints require standard `Bearer <access_token>` in the `Authorization` header.\n' +
        '- **Rate Limiting**: Throttled endpoints return standard `X-RateLimit-*` and `Retry-After` headers with HTTP 429 upon exhaustion.\n')
        .setVersion('1.0.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token (e.g. Bearer eyJhbGciOi...)',
        in: 'header',
    }, 'bearer-jwt')
        .addTag('System', 'System status, health probes, and application liveness')
        .addTag('Authentication', 'Session tokens, Argon2id authentication, token rotation, and password reset')
        .addTag('User Management', 'Administrative user administration, roles, statuses, and profiles')
        .addTag('Roles Management', 'System role querying and permission matrices')
        .addTag('Test / Diagnostic Endpoints', 'Access control and guard diagnostic endpoints')
        .build();
}
function setupSwagger(app) {
    const configService = app.get(config_1.ConfigService);
    const nodeEnv = configService.get('NODE_ENV') || 'development';
    const swaggerEnabledConfig = configService.get('SWAGGER_ENABLED');
    const isEnabled = swaggerEnabledConfig === 'true' ||
        (swaggerEnabledConfig !== 'false' && nodeEnv !== 'production');
    if (!isEnabled) {
        return null;
    }
    const config = buildSwaggerConfig();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
        },
        customSiteTitle: 'SEG Academy CRM API Docs',
    });
    return document;
}
//# sourceMappingURL=swagger.config.js.map