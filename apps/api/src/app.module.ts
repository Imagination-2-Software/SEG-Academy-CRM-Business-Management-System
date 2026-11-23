import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthService } from './health.service';
import { TestAccessController } from './test-access.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { AcademicModule } from './academic/academic.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { validateEnvironment } from './common/config/env.validation';
import { RateLimiterGuard } from './common/rate-limiting/rate-limiter.guard';
import { RateLimiterStorageService } from './common/rate-limiting/rate-limiter-storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    RolesModule,
    UsersModule,
    StudentsModule,
    AcademicModule,
  ],
  controllers: [AppController, TestAccessController],
  providers: [
    AppService,
    HealthService,
    RateLimiterStorageService,
    // Global Exception Filter: Centralized, secure error serialization
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global Response Interceptor: Standard API envelope wrapping with correlation ID
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global Request Logging Interceptor: Structured HTTP tracing with correlation ID
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    // Global Guard 0: Rate Limiter Guard (Throttling & brute-force protection)
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
    // Global Guard 1: Enforces authentication across all routes (bypassed only by @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Guard 2: Enforces role authorization if @Roles() is present
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Guard 3: Enforces permission authorization if @Permissions() is present
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply correlation ID middleware to all incoming routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
