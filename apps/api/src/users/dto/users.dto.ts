import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AccountStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  INVITED = 'INVITED',
}

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@segacademy.com',
    description: 'Unique employee email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full legal name of the employee',
  })
  @IsString({ message: 'Full name must be a string.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters.' })
  phoneNumber?: string;

  @ApiProperty({
    example: 'ComplexP@ssw0rd2026!',
    description: 'Initial account password (minimum 8 characters)',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Initial password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters.' })
  password!: string;

  @ApiProperty({
    example: 'role-uuid-1234',
    description: 'Authoritative Role ID to assign',
  })
  @IsString({ message: 'Role ID must be a string.' })
  @IsNotEmpty({ message: 'Role ID is required.' })
  roleId!: string;

  @ApiPropertyOptional({
    enum: AccountStatusEnum,
    default: AccountStatusEnum.ACTIVE,
    description: 'Initial account status',
  })
  @IsOptional()
  @IsEnum(AccountStatusEnum, { message: 'Invalid account status.' })
  status?: AccountStatusEnum;

  @ApiPropertyOptional({
    example: 'https://cdn.segacademy.com/avatars/user.png',
    description: 'Avatar image URL',
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string.' })
  avatarUrl?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John Jonathan Doe',
    description: 'Updated full name',
  })
  @IsOptional()
  @IsString({ message: 'Full name must be a string.' })
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName?: string;

  @ApiPropertyOptional({
    example: '+919876543211',
    description: 'Updated phone number',
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters.' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.segacademy.com/avatars/new-avatar.png',
    description: 'Updated avatar URL',
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string.' })
  avatarUrl?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: AccountStatusEnum,
    example: AccountStatusEnum.SUSPENDED,
    description: 'Target account status',
  })
  @IsEnum(AccountStatusEnum, { message: 'Status must be ACTIVE, INACTIVE, SUSPENDED, or INVITED.' })
  @IsNotEmpty({ message: 'Status is required.' })
  status!: AccountStatusEnum;

  @ApiPropertyOptional({
    example: 'Employee resigned or security suspension',
    description: 'Reason for status modification',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ReplaceUserRolesDto {
  @ApiProperty({
    example: ['role-uuid-1234'],
    description: 'Array of target Role IDs (currently single primary role in schema)',
  })
  @IsArray({ message: 'Role IDs must be an array.' })
  @ArrayMinSize(1, { message: 'At least one role ID must be provided.' })
  @IsString({ each: true, message: 'Each role ID must be a string.' })
  roleIds!: string[];
}

export class QueryUsersDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number (minimum 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Items per page (max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Fuzzy search by name, email, or phone number',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AccountStatusEnum,
    description: 'Filter by account status',
  })
  @IsOptional()
  @IsEnum(AccountStatusEnum)
  status?: AccountStatusEnum;

  @ApiPropertyOptional({
    example: 'ADMIN',
    description: 'Filter by role code',
  })
  @IsOptional()
  @IsString()
  roleCode?: string;
}
