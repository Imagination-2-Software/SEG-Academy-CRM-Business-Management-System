import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchStatus, EnrolmentStatus } from '@seg/database';

// -----------------------------------------------------------------------------
// COURSE DTOS
// -----------------------------------------------------------------------------

export class CreateCourseDto {
  @ApiProperty({ example: 'FS-WEB-01', description: 'Unique course code' })
  @IsString()
  @IsNotEmpty({ message: 'Course code is required.' })
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Full Stack Web Development', description: 'Course title' })
  @IsString()
  @IsNotEmpty({ message: 'Course title is required.' })
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Complete immersion in modern web software engineering' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 24, description: 'Duration in weeks' })
  @IsInt()
  @Min(1)
  @Max(200)
  durationWeeks!: number;

  @ApiPropertyOptional({ example: 60, description: 'Total academic credits' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCredits?: number;

  @ApiProperty({ example: 125000.0, description: 'Base course fee' })
  @IsNumber()
  @Min(0)
  baseFee!: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Full Stack Web Development' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated curriculum outline' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 26 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCredits?: number;

  @ApiPropertyOptional({ example: 135000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCoursesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search term matching code or title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

// -----------------------------------------------------------------------------
// BATCH DTOS
// -----------------------------------------------------------------------------

export class CreateBatchDto {
  @ApiProperty({ example: 'course-uuid-1', description: 'ID of the course' })
  @IsString()
  @IsNotEmpty({ message: 'Course ID is required.' })
  courseId!: string;

  @ApiProperty({ example: 'FSW-2026-A', description: 'Unique batch code' })
  @IsString()
  @IsNotEmpty({ message: 'Batch code is required.' })
  @MinLength(2)
  @MaxLength(50)
  batchCode!: string;

  @ApiProperty({ example: 'Cohort Alpha 2026', description: 'Batch name' })
  @IsString()
  @IsNotEmpty({ message: 'Batch name is required.' })
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '2026-03-01', description: 'Start date (ISO-8601)' })
  @IsDateString({}, { message: 'Start date must be a valid ISO date.' })
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'End date (ISO-8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date.' })
  endDate?: string;

  @ApiProperty({ example: 30, description: 'Student seat capacity' })
  @IsInt()
  @Min(1)
  @Max(500)
  capacity!: number;

  @ApiPropertyOptional({ enum: BatchStatus, default: BatchStatus.UPCOMING })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus = BatchStatus.UPCOMING;

  @ApiPropertyOptional({ example: 'emp-uuid-1', description: 'Instructor employee ID' })
  @IsOptional()
  @IsString()
  instructorId?: string;
}

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 'Cohort Alpha 2026 - Evening' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({ example: 'emp-uuid-2' })
  @IsOptional()
  @IsString()
  instructorId?: string;
}

export class QueryBatchesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filter by Course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ enum: BatchStatus })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({ description: 'Search term matching batch code or name' })
  @IsOptional()
  @IsString()
  search?: string;
}

// -----------------------------------------------------------------------------
// ENROLMENT DTOS
// -----------------------------------------------------------------------------

export class CreateEnrolmentDto {
  @ApiProperty({ example: 'stu-uuid-1', description: 'Student ID' })
  @IsString()
  @IsNotEmpty({ message: 'Student ID is required.' })
  studentId!: string;

  @ApiProperty({ example: 'batch-uuid-1', description: 'Batch ID' })
  @IsString()
  @IsNotEmpty({ message: 'Batch ID is required.' })
  batchId!: string;

  @ApiPropertyOptional({ enum: EnrolmentStatus, default: EnrolmentStatus.ENROLLED })
  @IsOptional()
  @IsEnum(EnrolmentStatus)
  status?: EnrolmentStatus = EnrolmentStatus.ENROLLED;
}

export class UpdateEnrolmentStatusDto {
  @ApiProperty({ enum: EnrolmentStatus, example: EnrolmentStatus.GRADUATED })
  @IsEnum(EnrolmentStatus, { message: 'Invalid enrolment status.' })
  status!: EnrolmentStatus;

  @ApiPropertyOptional({ example: 'A+', description: 'Final academic grade if completed' })
  @IsOptional()
  @IsString()
  finalGrade?: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Completion date' })
  @IsOptional()
  @IsDateString()
  completionDate?: string;
}

export class QueryEnrolmentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filter by Student ID' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Batch ID' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ enum: EnrolmentStatus })
  @IsOptional()
  @IsEnum(EnrolmentStatus)
  status?: EnrolmentStatus;
}
