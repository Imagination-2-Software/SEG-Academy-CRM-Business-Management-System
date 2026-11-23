import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface StandardApiResponse<T = any> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  correlationId?: string;
}

export interface PaginatedResult<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    [key: string]: any;
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardApiResponse<T> | T> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((body) => {
        // 1. If response is already in StandardApiResponse format (anti-double-wrapping)
        if (
          body !== null &&
          typeof body === 'object' &&
          'success' in body &&
          'statusCode' in body &&
          'timestamp' in body &&
          'path' in body
        ) {
          return body;
        }

        const statusCode = res.statusCode || 200;
        const path = req.originalUrl || req.url || '';
        const timestamp = new Date().toISOString();
        const correlationId = req.correlationId;

        // 2. Handle object with custom message and nested payload (e.g., AuthController / PasswordReset responses)
        // If body has a top-level message (and possibly success: true)
        let message = 'Request completed successfully';
        let payloadData: any = body;

        if (
          body !== null &&
          typeof body === 'object' &&
          !Array.isArray(body)
        ) {
          // If the service explicitly returned a message, use it
          if (typeof body.message === 'string') {
            message = body.message;
            // If body has only { success, message }, payload is empty object or preserved
            if (Object.keys(body).length === 2 && 'success' in body && 'message' in body) {
              payloadData = {};
            } else if (Object.keys(body).length === 1 && 'message' in body) {
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
      }),
    );
  }
}
