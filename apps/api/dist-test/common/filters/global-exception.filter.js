"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@seg/database");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const path = request.originalUrl || request.url || '';
        const timestamp = new Date().toISOString();
        const correlationId = request.correlationId;
        let statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'An unexpected internal server error occurred.';
        let error = 'Internal Server Error';
        let details = undefined;
        if (exception instanceof common_1.HttpException) {
            statusCode = exception.getStatus();
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
                error = exception.name.replace('Exception', '');
            }
            else if (typeof res === 'object' && res !== null) {
                const resObj = res;
                error = resObj.error || exception.name.replace('Exception', '');
                if (Array.isArray(resObj.message)) {
                    message = resObj.message.join('; ');
                    details = resObj.message;
                }
                else if (typeof resObj.message === 'string') {
                    message = resObj.message;
                }
                else {
                    message = exception.message || 'Request failed';
                }
            }
        }
        else if (exception instanceof database_1.Prisma.PrismaClientKnownRequestError) {
            const prismaError = this.handlePrismaKnownError(exception);
            statusCode = prismaError.statusCode;
            message = prismaError.message;
            error = prismaError.error;
        }
        else if (exception instanceof database_1.Prisma.PrismaClientValidationError) {
            statusCode = common_1.HttpStatus.BAD_REQUEST;
            message = 'Invalid data provided for database operation.';
            error = 'Bad Request';
            this.logger.warn(`Prisma Validation Error: ${exception.message}`);
        }
        else if (exception instanceof Error) {
            statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected internal server error occurred.';
            error = 'Internal Server Error';
            this.logger.error(`Unhandled Exception on ${request.method} ${path}: ${exception.message}`, exception.stack);
        }
        else {
            statusCode = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected internal server error occurred.';
            error = 'Internal Server Error';
            this.logger.error(`Unknown Non-Error Exception on ${request.method} ${path}: ${String(exception)}`);
        }
        const errorResponse = {
            success: false,
            statusCode,
            message,
            error,
            ...(details ? { details } : {}),
            timestamp,
            path,
            ...(correlationId ? { correlationId } : {}),
        };
        response.status(statusCode).json(errorResponse);
    }
    handlePrismaKnownError(err) {
        switch (err.code) {
            case 'P2002': {
                const target = Array.isArray(err.meta?.target)
                    ? err.meta.target.join(', ')
                    : String(err.meta?.target || 'field');
                return {
                    statusCode: common_1.HttpStatus.CONFLICT,
                    message: `A record with this ${target} already exists.`,
                    error: 'Conflict',
                };
            }
            case 'P2025': {
                return {
                    statusCode: common_1.HttpStatus.NOT_FOUND,
                    message: 'The requested record was not found.',
                    error: 'Not Found',
                };
            }
            case 'P2003': {
                return {
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    message: 'Referenced related record does not exist or violates relational constraint.',
                    error: 'Bad Request',
                };
            }
            case 'P2014': {
                return {
                    statusCode: common_1.HttpStatus.BAD_REQUEST,
                    message: 'The change violates a required relational dependency between records.',
                    error: 'Bad Request',
                };
            }
            default: {
                this.logger.error(`Unhandled Prisma error code: ${err.code} - ${err.message}`);
                return {
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'A database integrity error occurred.',
                    error: 'Internal Server Error',
                };
            }
        }
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map