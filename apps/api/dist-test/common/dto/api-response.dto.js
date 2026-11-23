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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPaginationMeta = exports.ApiErrorResponseEnvelope = exports.ApiResponseEnvelope = void 0;
const swagger_1 = require("@nestjs/swagger");
class ApiResponseEnvelope {
    success;
    statusCode;
    message;
    data;
    timestamp;
    path;
    correlationId;
}
exports.ApiResponseEnvelope = ApiResponseEnvelope;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Indicates successful execution' }),
    __metadata("design:type", Boolean)
], ApiResponseEnvelope.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 200, description: 'HTTP status code' }),
    __metadata("design:type", Number)
], ApiResponseEnvelope.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Request completed successfully', description: 'Human-readable response message' }),
    __metadata("design:type", String)
], ApiResponseEnvelope.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payload returned by the endpoint' }),
    __metadata("design:type", Object)
], ApiResponseEnvelope.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-11-17T07:30:00.000Z', description: 'ISO 8601 timestamp' }),
    __metadata("design:type", String)
], ApiResponseEnvelope.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '/api/v1/users', description: 'Endpoint path' }),
    __metadata("design:type", String)
], ApiResponseEnvelope.prototype, "path", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Correlation ID for distributed tracing' }),
    __metadata("design:type", String)
], ApiResponseEnvelope.prototype, "correlationId", void 0);
class ApiErrorResponseEnvelope {
    success;
    statusCode;
    message;
    error;
    details;
    timestamp;
    path;
    correlationId;
}
exports.ApiErrorResponseEnvelope = ApiErrorResponseEnvelope;
__decorate([
    (0, swagger_1.ApiProperty)({ example: false, description: 'Indicates request failure' }),
    __metadata("design:type", Boolean)
], ApiErrorResponseEnvelope.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 400, description: 'HTTP status code' }),
    __metadata("design:type", Number)
], ApiErrorResponseEnvelope.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Invalid email or password.', description: 'Sanitized error message' }),
    __metadata("design:type", String)
], ApiErrorResponseEnvelope.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Unauthorized', description: 'Error category / exception name' }),
    __metadata("design:type", String)
], ApiErrorResponseEnvelope.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Detailed validation error messages if applicable' }),
    __metadata("design:type", Object)
], ApiErrorResponseEnvelope.prototype, "details", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-11-17T07:30:00.000Z', description: 'ISO 8601 timestamp' }),
    __metadata("design:type", String)
], ApiErrorResponseEnvelope.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '/api/v1/auth/login', description: 'Endpoint path' }),
    __metadata("design:type", String)
], ApiErrorResponseEnvelope.prototype, "path", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Correlation ID for distributed tracing' }),
    __metadata("design:type", String)
], ApiErrorResponseEnvelope.prototype, "correlationId", void 0);
class ApiPaginationMeta {
    page;
    limit;
    total;
    totalPages;
}
exports.ApiPaginationMeta = ApiPaginationMeta;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Current page number' }),
    __metadata("design:type", Number)
], ApiPaginationMeta.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 20, description: 'Number of items per page' }),
    __metadata("design:type", Number)
], ApiPaginationMeta.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 150, description: 'Total number of items matching filters' }),
    __metadata("design:type", Number)
], ApiPaginationMeta.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 8, description: 'Total number of pages' }),
    __metadata("design:type", Number)
], ApiPaginationMeta.prototype, "totalPages", void 0);
//# sourceMappingURL=api-response.dto.js.map