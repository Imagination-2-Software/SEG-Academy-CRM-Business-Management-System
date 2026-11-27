import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsDateString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EmploymentType, AccountStatus, InternshipStatus } from '@seg/database';

export class CreateEmployeeDto {
  @ApiProperty({
    example: 'EMP-010',
    description: 'Unique employee code identifier',
  })
  @IsString({ message: 'employeeCode must be a string.' })
  @IsNotEmpty({ message: 'employeeCode is required.' })
  @MinLength(2, { message: 'employeeCode must be at least 2 characters.' })
  @MaxLength(30, { message: 'employeeCode cannot exceed 30 characters.' })
  employeeCode!: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Full legal name of the employee',
  })
  @IsString({ message: 'fullName must be a string.' })
  @IsNotEmpty({ message: 'fullName is required.' })
  @MinLength(2, { message: 'fullName must be at least 2 characters.' })
  @MaxLength(100, { message: 'fullName cannot exceed 100 characters.' })
  fullName!: string;

  @ApiProperty({
    example: 'jane.doe@segacademy.com',
    description: 'Corporate email address for login and notifications',
  })
  @IsEmail({}, { message: 'email must be a valid email address.' })
  @IsNotEmpty({ message: 'email is required.' })
  email!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString({ message: 'phoneNumber must be a string.' })
  @MaxLength(20, { message: 'phoneNumber cannot exceed 20 characters.' })
  phoneNumber?: string;

  @ApiProperty({
    example: 'Senior Instructor',
    description: 'Designation or job title',
  })
  @IsString({ message: 'jobTitle must be a string.' })
  @IsNotEmpty({ message: 'jobTitle is required.' })
  @MinLength(2, { message: 'jobTitle must be at least 2 characters.' })
  @MaxLength(100, { message: 'jobTitle cannot exceed 100 characters.' })
  jobTitle!: string;

  @ApiProperty({
    enum: EmploymentType,
    example: EmploymentType.FULL_TIME,
    description: 'Type of employment',
  })
  @IsEnum(EmploymentType, {
    message: 'employmentType must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERN',
  })
  @IsNotEmpty({ message: 'employmentType is required.' })
  employmentType!: EmploymentType;

  @ApiPropertyOptional({
    example: 'TRAINER_FACULTY',
    description: 'Role code or Role UUID. Defaults to EMPLOYEE_INTERN if omitted.',
  })
  @IsOptional()
  @IsString({ message: 'roleCode must be a string.' })
  roleCode?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'ID of the assigned Department',
  })
  @IsOptional()
  @IsUUID('all', { message: 'departmentId must be a valid UUID.' })
  departmentId?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000002',
    description: 'ID of the assigned Team',
  })
  @IsOptional()
  @IsUUID('all', { message: 'teamId must be a valid UUID.' })
  teamId?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000003',
    description: 'ID of reporting manager ProfileEmployee',
  })
  @IsOptional()
  @IsUUID('all', { message: 'managerId must be a valid UUID.' })
  managerId?: string;

  @ApiProperty({
    example: '2026-01-15',
    description: 'Date joined SEG Academy (ISO-8601)',
  })
  @IsDateString({}, { message: 'joinDate must be a valid ISO-8601 date string.' })
  @IsNotEmpty({ message: 'joinDate is required.' })
  joinDate!: string;

  // Intern Details (Optional, applies when employmentType === 'INTERN')
  @ApiPropertyOptional({
    example: 'ABC Institute of Technology',
    description: 'College or university name for interns',
  })
  @IsOptional()
  @IsString({ message: 'collegeName must be a string.' })
  @MaxLength(150, { message: 'collegeName cannot exceed 150 characters.' })
  collegeName?: string;

  @ApiPropertyOptional({
    example: 'B.Tech in Computer Science & Engineering',
    description: 'Academic degree being pursued',
  })
  @IsOptional()
  @IsString({ message: 'academicDegree must be a string.' })
  @MaxLength(150, { message: 'academicDegree cannot exceed 150 characters.' })
  academicDegree?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000004',
    description: 'ID of assigned mentor ProfileEmployee for intern',
  })
  @IsOptional()
  @IsUUID('all', { message: 'mentorId must be a valid UUID.' })
  mentorId?: string;

  @ApiPropertyOptional({
    example: '2026-07-15',
    description: 'Internship completion date (ISO-8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO-8601 date string.' })
  endDate?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Senior Instructor' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  teamId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all')
  managerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exitDate?: string | null;

  @ApiPropertyOptional({ example: 'Jane Doe' })
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
}

export class UpdateEmployeeStatusDto {
  @ApiProperty({
    enum: AccountStatus,
    example: AccountStatus.ACTIVE,
    description: 'Updated user account status',
  })
  @IsEnum(AccountStatus, {
    message: 'status must be one of: ACTIVE, INACTIVE, SUSPENDED, INVITED',
  })
  @IsNotEmpty({ message: 'status is required.' })
  status!: AccountStatus;
}

export class QueryEmployeesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ description: 'Filter by search query in name, email, code or title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsOptional()
  @IsUUID('all')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by team UUID' })
  @IsOptional()
  @IsUUID('all')
  teamId?: string;

  @ApiPropertyOptional({ enum: EmploymentType, description: 'Filter by employment type' })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: AccountStatus, description: 'Filter by account status' })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
