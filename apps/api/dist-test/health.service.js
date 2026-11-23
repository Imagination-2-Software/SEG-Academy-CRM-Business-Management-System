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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma/prisma.service");
let HealthService = HealthService_1 = class HealthService {
    prisma;
    logger = new common_1.Logger(HealthService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getLiveness() {
        return {
            status: 'ok',
            service: 'SEG Academy CRM API',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        };
    }
    async getReadiness() {
        const memoryUsage = process.memoryUsage();
        const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);
        let dbStatus = 'up';
        let latencyMs = undefined;
        let dbMessage = undefined;
        const start = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            latencyMs = Date.now() - start;
        }
        catch (err) {
            dbStatus = 'down';
            latencyMs = Date.now() - start;
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Database readiness check failed: ${msg}`);
            dbMessage = 'Database connection check failed';
        }
        const overallStatus = dbStatus === 'up' ? 'ok' : 'error';
        return {
            status: overallStatus,
            service: 'SEG Academy CRM API',
            timestamp: new Date().toISOString(),
            checks: {
                database: {
                    status: dbStatus,
                    ...(latencyMs !== undefined ? { latencyMs } : {}),
                    ...(dbMessage ? { message: dbMessage } : {}),
                },
                memory: {
                    status: 'up',
                    heapUsedMb,
                    rssMb,
                },
            },
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map