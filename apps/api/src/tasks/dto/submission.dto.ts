import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskSubmissionDto {
  @ApiPropertyOptional({
    example: 'https://storage.segacademy.com/submissions/doc1.pdf',
    description: 'URL or storage key pointing to the submission asset',
  })
  @IsOptional()
  @IsString({ message: 'contentUrl must be a string.' })
  @MaxLength(1000, { message: 'contentUrl cannot exceed 1000 characters.' })
  contentUrl?: string;

  @ApiPropertyOptional({
    example: 'Completed the draft review and attached observations.',
    description: 'Submission notes or remarks from submitter',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string.' })
  @MaxLength(2000, { message: 'notes cannot exceed 2000 characters.' })
  notes?: string;

  @ApiPropertyOptional({
    example: 'Curriculum_Draft_v2.pdf',
    description: 'Original filename of the submitted asset',
  })
  @IsOptional()
  @IsString({ message: 'attachmentName must be a string.' })
  @MaxLength(255, { message: 'attachmentName cannot exceed 255 characters.' })
  attachmentName?: string;

  @ApiPropertyOptional({
    example: '2.4 MB',
    description: 'Formatted file size',
  })
  @IsOptional()
  @IsString({ message: 'attachmentSize must be a string.' })
  @MaxLength(50, { message: 'attachmentSize cannot exceed 50 characters.' })
  attachmentSize?: string;
}

export class CreateSubmissionReviewDto {
  @ApiProperty({
    example: 88.5,
    minimum: 0,
    maximum: 100,
    description: 'Score awarded out of 100',
  })
  @IsNumber({}, { message: 'score must be a number.' })
  @Min(0, { message: 'score cannot be less than 0.' })
  @Max(100, { message: 'score cannot exceed 100.' })
  score!: number;

  @ApiPropertyOptional({
    example: 'Strong execution, key edge cases addressed properly.',
    description: 'Detailed evaluation feedback',
  })
  @IsOptional()
  @IsString({ message: 'feedback must be a string.' })
  @MaxLength(2000, { message: 'feedback cannot exceed 2000 characters.' })
  feedback?: string;

  @ApiProperty({
    example: 'APPROVED',
    enum: ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
    description: 'Review outcome status',
  })
  @IsString({ message: 'status must be a string.' })
  @IsNotEmpty({ message: 'status is required.' })
  status!: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
}
