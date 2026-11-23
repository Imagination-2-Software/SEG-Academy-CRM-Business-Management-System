import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard Envelope for Successful API Responses.
 * Matches ResponseInterceptor runtime format.
 */
export class ApiResponseEnvelope<T = any> {
  @ApiProperty({ example: true, description: 'Indicates successful execution' })
  success!: boolean;

  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({ example: 'Request completed successfully', description: 'Human-readable response message' })
  message!: string;

  @ApiProperty({ description: 'Payload returned by the endpoint' })
  data!: T;

  @ApiProperty({ example: '2026-11-17T07:30:00.000Z', description: 'ISO 8601 timestamp' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/users', description: 'Endpoint path' })
  path!: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Correlation ID for distributed tracing' })
  correlationId?: string;
}

/**
 * Standard Envelope for Error API Responses.
 * Matches GlobalExceptionFilter runtime format.
 */
export class ApiErrorResponseEnvelope {
  @ApiProperty({ example: false, description: 'Indicates request failure' })
  success!: boolean;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode!: number;

  @ApiProperty({ example: 'Invalid email or password.', description: 'Sanitized error message' })
  message!: string;

  @ApiProperty({ example: 'Unauthorized', description: 'Error category / exception name' })
  error!: string;

  @ApiPropertyOptional({ description: 'Detailed validation error messages if applicable' })
  details?: any;

  @ApiProperty({ example: '2026-11-17T07:30:00.000Z', description: 'ISO 8601 timestamp' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/auth/login', description: 'Endpoint path' })
  path!: string;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Correlation ID for distributed tracing' })
  correlationId?: string;
}

/**
 * Pagination Metadata schema.
 */
export class ApiPaginationMeta {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ example: 150, description: 'Total number of items matching filters' })
  total!: number;

  @ApiProperty({ example: 8, description: 'Total number of pages' })
  totalPages!: number;
}
