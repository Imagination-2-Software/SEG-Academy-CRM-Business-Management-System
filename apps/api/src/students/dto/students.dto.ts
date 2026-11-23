import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType, DocumentVerificationStatus } from '@seg/database';

export class CreateStudentDto {
  @ApiProperty({
    example: 'Aarav Sharma',
    description: 'Full name of the student',
  })
  @IsString({ message: 'Full name must be a string.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName!: string;

  @ApiProperty({
    example: 'aarav.sharma@example.com',
    description: 'Unique email address of the student',
  })
  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Primary contact phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: '2004-05-15',
    description: 'Date of birth (ISO-8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date string.' })
  dateOfBirth?: string;

  @ApiPropertyOptional({
    example: 'Male',
    description: 'Gender',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({
    example: 'Indian',
    description: 'Nationality',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({
    example: '123 Academy Lane',
    description: 'Primary address line 1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Address line 2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({
    example: 'Mumbai',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 'Maharashtra',
    description: 'State / Province',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    example: 'India',
    description: 'Country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    example: '400001',
    description: 'Postal / PIN code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    example: '+919876543211',
    description: 'Emergency contact phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContact?: string;

  @ApiPropertyOptional({
    example: 'Rajesh Sharma',
    description: 'Parent or guardian full name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianName?: string;

  @ApiPropertyOptional({
    example: '+919876543212',
    description: 'Parent or guardian phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guardianPhone?: string;

  @ApiPropertyOptional({
    example: 'rajesh.sharma@example.com',
    description: 'Parent or guardian email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Guardian email must be a valid email address.' })
  guardianEmail?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '2004-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Male' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: 'Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({ example: '123 Academy Lane' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'Rajesh Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianName?: string;

  @ApiPropertyOptional({ example: '+919876543212' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guardianPhone?: string;

  @ApiPropertyOptional({ example: 'rajesh.sharma@example.com' })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;
}

export class QueryStudentsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search term matching name, email, or student code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by country' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateStudentDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.TRANSCRIPT,
    description: 'Type of document being uploaded',
  })
  @IsEnum(DocumentType, { message: 'Invalid document type.' })
  documentType!: DocumentType;

  @ApiProperty({
    example: 'HighSchool_Transcript_2026.pdf',
    description: 'Original name of the file',
  })
  @IsString()
  @IsNotEmpty({ message: 'Document name is required.' })
  @MaxLength(255)
  documentName!: string;

  @ApiProperty({
    example: 'students/docs/uuid-path.pdf',
    description: 'Storage key path in Supabase Private Storage',
  })
  @IsString()
  @IsNotEmpty({ message: 'File storage key is required.' })
  fileStorageKey!: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME type of the file',
  })
  @IsString()
  @IsNotEmpty({ message: 'MIME type is required.' })
  mimeType!: string;

  @ApiProperty({
    example: 1048576,
    description: 'File size in bytes (max 10MB)',
  })
  @IsInt()
  @Min(1)
  @Max(10485760, { message: 'File size cannot exceed 10MB.' })
  fileSizeBytes!: number;
}

export class VerifyStudentDocumentDto {
  @ApiProperty({
    enum: DocumentVerificationStatus,
    example: DocumentVerificationStatus.VERIFIED,
    description: 'Updated verification status',
  })
  @IsEnum(DocumentVerificationStatus, { message: 'Invalid verification status.' })
  status!: DocumentVerificationStatus;

  @ApiPropertyOptional({
    example: 'Document illegible or missing official seal.',
    description: 'Reason for rejection if status is REJECTED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
