"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const health_service_1 = require("./health.service");
const test_access_controller_1 = require("./test-access.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const audit_module_1 = require("./audit/audit.module");
const roles_module_1 = require("./roles/roles.module");
const users_module_1 = require("./users/users.module");
const students_module_1 = require("./students/students.module");
const academic_module_1 = require("./academic/academic.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./auth/guards/roles.guard");
const permissions_guard_1 = require("./auth/guards/permissions.guard");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const request_logging_interceptor_1 = require("./common/interceptors/request-logging.interceptor");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const correlation_id_middleware_1 = require("./common/middleware/correlation-id.middleware");
const env_validation_1 = require("./common/config/env.validation");
const rate_limiter_guard_1 = require("./common/rate-limiting/rate-limiter.guard");
const rate_limiter_storage_service_1 = require("./common/rate-limiting/rate-limiter-storage.service");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(correlation_id_middleware_1.CorrelationIdMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
                validate: env_validation_1.validateEnvironment,
            }),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            roles_module_1.RolesModule,
            users_module_1.UsersModule,
            students_module_1.StudentsModule,
            academic_module_1.AcademicModule,
        ],
        controllers: [app_controller_1.AppController, test_access_controller_1.TestAccessController],
        providers: [
            app_service_1.AppService,
            health_service_1.HealthService,
            rate_limiter_storage_service_1.RateLimiterStorageService,
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: response_interceptor_1.ResponseInterceptor,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: request_logging_interceptor_1.RequestLoggingInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: rate_limiter_guard_1.RateLimiterGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: permissions_guard_1.PermissionsGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map