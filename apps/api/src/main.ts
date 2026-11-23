import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './common/config/swagger.config';
import { buildCorsOptions } from './common/security/cors.config';
import { securityHeadersMiddleware } from './common/security/security-headers.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';

  // 1. HTTP Security Headers (OWASP Content-Security-Policy, HSTS, Frameguard, etc.)
  app.use(securityHeadersMiddleware({ isProduction }));

  // 2. Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Global API Prefix
  app.setGlobalPrefix('api/v1');

  // 4. Centralized CORS Configuration
  const rawCorsOrigin = configService.get<string>('CORS_ORIGIN');
  const allowedOrigins = rawCorsOrigin
    ? rawCorsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000'];

  app.enableCors(buildCorsOptions({ allowedOrigins, isProduction }));

  // 5. Swagger / OpenAPI documentation integration
  const swaggerDoc = setupSwagger(app);

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);

  logger.log(`SEG Academy CRM API is running on: http://localhost:${port}/api/v1`);
  logger.log(`Active Environment: ${nodeEnv}`);
  logger.log(`Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
  if (swaggerDoc) {
    logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  } else {
    logger.log(`Swagger OpenAPI Documentation is disabled in this environment.`);
  }
}

bootstrap();
