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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(data) {
        try {
            const rawPayload = data.payload || {};
            const payloadWithMeta = data.correlationId
                ? { ...rawPayload, correlationId: data.correlationId }
                : rawPayload;
            const sanitizedPayload = this.sanitizePayload(payloadWithMeta);
            await this.prisma.auditLog.create({
                data: {
                    userId: data.actorUserId,
                    action: data.action,
                    resource: data.resource,
                    resourceId: data.resourceId,
                    payload: sanitizedPayload,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                },
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to record audit log for action ${data.action}: ${msg}`);
        }
    }
    sanitizePayload(payload) {
        const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
        const sanitized = {};
        for (const [key, val] of Object.entries(payload)) {
            if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (val && typeof val === 'object' && !Array.isArray(val)) {
                sanitized[key] = this.sanitizePayload(val);
            }
            else {
                sanitized[key] = val;
            }
        }
        return sanitized;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map