"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let ResponseInterceptor = class ResponseInterceptor {
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        return next.handle().pipe((0, operators_1.map)((body) => {
            if (body !== null &&
                typeof body === 'object' &&
                'success' in body &&
                'statusCode' in body &&
                'timestamp' in body &&
                'path' in body) {
                return body;
            }
            const statusCode = res.statusCode || 200;
            const path = req.originalUrl || req.url || '';
            const timestamp = new Date().toISOString();
            const correlationId = req.correlationId;
            let message = 'Request completed successfully';
            let payloadData = body;
            if (body !== null &&
                typeof body === 'object' &&
                !Array.isArray(body)) {
                if (typeof body.message === 'string') {
                    message = body.message;
                    if (Object.keys(body).length === 2 && 'success' in body && 'message' in body) {
                        payloadData = {};
                    }
                    else if (Object.keys(body).length === 1 && 'message' in body) {
                        payloadData = {};
                    }
                }
            }
            return {
                success: true,
                statusCode,
                message,
                data: payloadData === undefined ? {} : payloadData,
                timestamp,
                path,
                ...(correlationId ? { correlationId } : {}),
            };
        }));
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseInterceptor);
//# sourceMappingURL=response.interceptor.js.map