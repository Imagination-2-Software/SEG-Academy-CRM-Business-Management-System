import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@segacademy.com',
    description: 'User registered email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a4f9b2c8e1d7...',
    description: 'Cryptographically secure, single-use password reset token',
  })
  @IsString({ message: 'Token must be a string.' })
  @IsNotEmpty({ message: 'Token is required.' })
  token!: string;

  @ApiProperty({
    example: 'NewSecurePassword123!',
    description: 'New password (minimum 8 characters)',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters.' })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'd9b7f5c6e8a4...',
    description: 'Cryptographically secure, single-use email verification token',
  })
  @IsString({ message: 'Token must be a string.' })
  @IsNotEmpty({ message: 'Token is required.' })
  token!: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@segacademy.com',
    description: 'User registered email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;
}
