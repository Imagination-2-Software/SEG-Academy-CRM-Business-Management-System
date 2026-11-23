import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@seg/database';

export interface StandardApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  details?: any;
  timestamp: string;
  path: string;
  correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = request.originalUrl || request.url || '';
    const timestamp = new Date().toISOString();
    const correlationId = request.correlationId;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred.';
    let error = 'Internal Server Error';
    let details: any = undefined;

    // 1. NestJS Built-in HttpExceptions (BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, etc.)
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name.replace('Exception', '');
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        error = resObj.error || exception.name.replace('Exception', '');

        // DTO Validation pipe errors: message can be string or string[]
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
          details = resObj.message;
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = exception.message || 'Request failed';
        }
      }
    }
    // 2. Prisma Known Request Errors (P2002, P2025, P2003, P2014, etc.)
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaKnownError(exception);
      statusCode = prismaError.statusCode;
      message = prismaError.message;
      error = prismaError.error;
    }
    // 3. Prisma Validation Errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided for database operation.';
      error = 'Bad Request';
      this.logger.warn(`Prisma Validation Error: ${exception.message}`);
    }
    // 4. Unknown Unhandled Internal Exceptions
    else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected internal server error occurred.';
      error = 'Internal Server Error';

      // Log full internal error safely with stack trace, never exposing it to the response
      this.logger.error(
        `Unhandled Exception on ${request.method} ${path}: ${exception.message}`,
        exception.stack,
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected internal server error occurred.';
      error = 'Internal Server Error';
      this.logger.error(`Unknown Non-Error Exception on ${request.method} ${path}: ${String(exception)}`);
    }

    // Build standard error response
    const errorResponse: StandardApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      ...(details ? { details } : {}),
      timestamp,
      path,
      ...(correlationId ? { correlationId } : {}),
    };

    // Send HTTP response safely
    response.status(statusCode).json(errorResponse);
  }

  /**
   * Translates Prisma error codes to clean, safe, non-leaking HTTP status codes and messages.
   * Never exposes raw SQL queries, table structures, or credentials.
   */
  private handlePrismaKnownError(err: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(', ')
          : String(err.meta?.target || 'field');
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists.`,
          error: 'Conflict',
        };
      }
      case 'P2025': {
        // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found.',
          error: 'Not Found',
        };
      }
      case 'P2003': {
        // Foreign key constraint failure
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced related record does not exist or violates relational constraint.',
          error: 'Bad Request',
        };
      }
      case 'P2014': {
        // Required relation violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The change violates a required relational dependency between records.',
          error: 'Bad Request',
        };
      }
      default: {
        this.logger.error(`Unhandled Prisma error code: ${err.code} - ${err.message}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database integrity error occurred.',
          error: 'Internal Server Error',
        };
      }
    }
  }
}
