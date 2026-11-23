import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@segacademy.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiProperty({
    example: 'ComplexPassword123!',
    description: 'User password (minimum 8 characters)',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters.' })
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'd9b7f5c6e8a4...',
    description: 'Opaque cryptographically secure refresh token',
  })
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token is required.' })
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({
    example: 'd9b7f5c6e8a4...',
    description: 'Opaque refresh token to revoke',
  })
  @IsString({ message: 'Refresh token must be a string.' })
  @IsNotEmpty({ message: 'Refresh token is required.' })
  refreshToken!: string;
}
