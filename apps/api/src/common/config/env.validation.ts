import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
  IsUrl,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export class EnvironmentVariables {
  @IsEnum(Environment, {
    message: 'NODE_ENV must be one of: development, staging, production, test',
  })
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber({}, { message: 'PORT must be a valid number' })
  @Min(1)
  @IsOptional()
  PORT: number = 4000;

  @IsString({ message: 'CORS_ORIGIN must be a string' })
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString({ message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  @IsString({ message: 'DIRECT_URL is required' })
  @IsOptional()
  DIRECT_URL?: string;

  @IsString({ message: 'JWT_SECRET is required' })
  @MinLength(32, {
    message: 'JWT_SECRET must be at least 32 characters long for 256-bit cryptographic strength',
  })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString({ message: 'JWT_REFRESH_SECRET is required' })
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters long for 256-bit cryptographic strength',
  })
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  // SMTP Settings
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  // Rate Limiting / Throttle Settings
  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT?: number = 100;

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL?: number = 60;

  @IsString()
  @IsOptional()
  TRUST_PROXY?: string = 'false';

  // Security Headers & HSTS Settings
  @IsString()
  @IsOptional()
  ENABLE_HSTS?: string;

  // Swagger Documentation Settings
  @IsString()
  @IsOptional()
  SWAGGER_ENABLED?: string = 'true';
}

/**
 * Validates environment variables during NestJS configuration initialization.
 * Throws a sanitized, safe descriptive error without leaking secrets or credentials.
 */
export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.flatMap((error) =>
      Object.values(error.constraints || {}),
    );
    throw new Error(
      `Environment configuration validation failed:\n - ${errorMessages.join('\n - ')}`,
    );
  }

  // Additional sanity checks without leaking connection details or secrets
  if (
    validatedConfig.DATABASE_URL &&
    !validatedConfig.DATABASE_URL.startsWith('postgresql://') &&
    !validatedConfig.DATABASE_URL.startsWith('postgres://')
  ) {
    throw new Error(
      'Environment configuration validation failed: DATABASE_URL must be a valid PostgreSQL connection URI (starting with postgresql:// or postgres://)',
    );
  }

  return validatedConfig;
}
