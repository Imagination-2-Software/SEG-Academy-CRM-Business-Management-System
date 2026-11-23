"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_service_1 = require("./app.service");
const health_service_1 = require("./health.service");
const auth_1 = require("./auth");
const rate_limit_decorator_1 = require("./common/rate-limiting/rate-limit.decorator");
let AppController = class AppController {
    appService;
    healthService;
    constructor(appService, healthService) {
        this.appService = appService;
        this.healthService = healthService;
    }
    getHealth() {
        return this.healthService.getLiveness();
    }
    getLiveness() {
        return this.healthService.getLiveness();
    }
    async getReadiness(res) {
        const readiness = await this.healthService.getReadiness();
        if (readiness.status !== 'ok') {
            res.status(common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        return readiness;
    }
};
exports.AppController = AppController;
__decorate([
    (0, auth_1.Public)(),
    (0, rate_limit_decorator_1.SkipRateLimit)(),
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Default system health check (Liveness)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'API health status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AppController.prototype, "getHealth", null);
__decorate([
    (0, auth_1.Public)(),
    (0, rate_limit_decorator_1.SkipRateLimit)(),
    (0, common_1.Get)('health/live'),
    (0, swagger_1.ApiOperation)({ summary: 'Liveness probe (Container orchestrator liveness)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Application process is live and responsive' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], AppController.prototype, "getLiveness", null);
__decorate([
    (0, auth_1.Public)(),
    (0, rate_limit_decorator_1.SkipRateLimit)(),
    (0, common_1.Get)('health/ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness probe (Verifies PostgreSQL database connectivity)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Application and database are ready to serve traffic' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Database dependency is unhealthy' }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getReadiness", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('Health & Monitoring'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        health_service_1.HealthService])
], AppController);
//# sourceMappingURL=app.controller.js.map