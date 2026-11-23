"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const swagger_config_1 = require("./common/config/swagger.config");
const cors_config_1 = require("./common/security/cors.config");
const security_headers_middleware_1 = require("./common/security/security-headers.middleware");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const nodeEnv = configService.get('NODE_ENV') || 'development';
    const isProduction = nodeEnv === 'production';
    app.use((0, security_headers_middleware_1.securityHeadersMiddleware)({ isProduction }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    const rawCorsOrigin = configService.get('CORS_ORIGIN');
    const allowedOrigins = rawCorsOrigin
        ? rawCorsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
        : ['http://localhost:3000'];
    app.enableCors((0, cors_config_1.buildCorsOptions)({ allowedOrigins, isProduction }));
    const swaggerDoc = (0, swagger_config_1.setupSwagger)(app);
    const port = configService.get('PORT') || 4000;
    await app.listen(port);
    logger.log(`SEG Academy CRM API is running on: http://localhost:${port}/api/v1`);
    logger.log(`Active Environment: ${nodeEnv}`);
    logger.log(`Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
    if (swaggerDoc) {
        logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
    }
    else {
        logger.log(`Swagger OpenAPI Documentation is disabled in this environment.`);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map