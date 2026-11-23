import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  ArgumentsHost,
} from '@nestjs/common';
import { Prisma } from '@seg/database';
import { GlobalExceptionFilter } from '../global-exception.filter';

describe('GlobalExceptionFilter Unit Tests', () => {
  const filter = new GlobalExceptionFilter();

  const createMockHost = (url = '/api/v1/resource'): {
    host: ArgumentsHost;
    getStatus: () => number;
    getBody: () => any;
  } => {
    let capturedStatus = 200;
    let capturedBody: any = null;

    const res: any = {
      status: (code: number) => {
        capturedStatus = code;
        return {
          json: (body: any) => {
            capturedBody = body;
          },
        };
      },
    };

    const req: any = {
      method: 'POST',
      originalUrl: url,
      url,
    };

    const host: ArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as any;

    return {
      host,
      getStatus: () => capturedStatus,
      getBody: () => capturedBody,
    };
  };

  it('1. HTTP 400 - BadRequestException with string message', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/test');
    const exception = new BadRequestException('Invalid payload provided.');

    filter.catch(exception, host);

    assert.equal(getStatus(), 400);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 400);
    assert.equal(body.message, 'Invalid payload provided.');
    assert.equal(body.error, 'Bad Request');
    assert.equal(body.path, '/api/v1/test');
    assert.ok(body.timestamp);
  });

  it('2. HTTP 400 - ValidationPipe DTO errors with array details', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/auth/login');
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['Email is required.', 'Password must be at least 8 characters long.'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    assert.equal(getStatus(), 400);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 400);
    assert.match(body.message, /Email is required/);
    assert.deepEqual(body.details, [
      'Email is required.',
      'Password must be at least 8 characters long.',
    ]);
  });

  it('3. HTTP 401 - UnauthorizedException', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/users');
    const exception = new UnauthorizedException('Missing Authorization header.');

    filter.catch(exception, host);

    assert.equal(getStatus(), 401);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 401);
    assert.equal(body.message, 'Missing Authorization header.');
    assert.equal(body.error, 'Unauthorized');
  });

  it('4. HTTP 403 - ForbiddenException', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/admin/billing');
    const exception = new ForbiddenException('Access denied. Insufficient permissions.');

    filter.catch(exception, host);

    assert.equal(getStatus(), 403);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 403);
    assert.equal(body.message, 'Access denied. Insufficient permissions.');
    assert.equal(body.error, 'Forbidden');
  });

  it('5. HTTP 404 - NotFoundException', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/users/non-existent-id');
    const exception = new NotFoundException('User with ID was not found.');

    filter.catch(exception, host);

    assert.equal(getStatus(), 404);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 404);
    assert.equal(body.message, 'User with ID was not found.');
    assert.equal(body.error, 'Not Found');
  });

  it('6. HTTP 500 - InternalServerErrorException', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/compute');
    const exception = new InternalServerErrorException('System calculation failed');

    filter.catch(exception, host);

    assert.equal(getStatus(), 500);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 500);
    assert.equal(body.message, 'System calculation failed');
  });

  it('7. Prisma P2002 - Unique Constraint Conflict mapped to HTTP 409', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/users');
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['email'] },
      },
    );

    filter.catch(prismaError, host);

    assert.equal(getStatus(), 409);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 409);
    assert.equal(body.error, 'Conflict');
    assert.equal(body.message, 'A record with this email already exists.');
  });

  it('8. Prisma P2025 - Record Not Found mapped to HTTP 404', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/users/uuid');
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'An operation failed because it depends on one or more records that were required but not found.',
      {
        code: 'P2025',
        clientVersion: '6.19.3',
      },
    );

    filter.catch(prismaError, host);

    assert.equal(getStatus(), 404);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 404);
    assert.equal(body.error, 'Not Found');
    assert.equal(body.message, 'The requested record was not found.');
  });

  it('9. Prisma P2003 - Foreign Key Constraint mapped to HTTP 400', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/users');
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: `roleId`',
      {
        code: 'P2003',
        clientVersion: '6.19.3',
      },
    );

    filter.catch(prismaError, host);

    assert.equal(getStatus(), 400);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 400);
    assert.equal(body.error, 'Bad Request');
    assert.match(body.message, /Referenced related record does not exist/);
  });

  it('10. Prisma P2014 - Required Relation Violation mapped to HTTP 400', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/roles');
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'The change you are trying to make would violate the required relation between models.',
      {
        code: 'P2014',
        clientVersion: '6.19.3',
      },
    );

    filter.catch(prismaError, host);

    assert.equal(getStatus(), 400);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 400);
    assert.equal(body.error, 'Bad Request');
    assert.match(body.message, /violates a required relational dependency/);
  });

  it('11. Unknown Unhandled Error - Sanitizes internal details and protects sensitive data', () => {
    const { host, getStatus, getBody } = createMockHost('/api/v1/sensitive');
    const unhandled = new Error(
      'DATABASE_URL="postgresql://postgres:SecretPassword123@db.supabase.co:5432" connection failed at select * from users where password_hash = ...',
    );

    filter.catch(unhandled, host);

    assert.equal(getStatus(), 500);
    const body = getBody();
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 500);
    assert.equal(body.error, 'Internal Server Error');
    // Must NOT leak credentials or SQL queries
    assert.equal(body.message, 'An unexpected internal server error occurred.');
    assert.equal((body as any).stack, undefined);
    assert.equal(JSON.stringify(body).includes('SecretPassword123'), false);
    assert.equal(JSON.stringify(body).includes('DATABASE_URL'), false);
  });
});
