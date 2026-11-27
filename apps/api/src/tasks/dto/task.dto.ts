import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@seg/database';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Review Module 4 Curriculum',
    description: 'Title of the task',
  })
  @IsString({ message: 'Task title must be a string.' })
  @IsNotEmpty({ message: 'Task title is required.' })
  @MinLength(3, { message: 'Task title must be at least 3 characters.' })
  @MaxLength(150, { message: 'Task title cannot exceed 150 characters.' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Ensure all code examples are tested against Node 20 LTS',
    description: 'Detailed description of the task',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters.' })
  description?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'ProfileEmployee ID assigned to this task',
  })
  @IsOptional()
  @IsUUID('all', { message: 'assignedToId must be a valid UUID.' })
  assignedToId?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000002',
    description: 'Department ID',
  })
  @IsOptional()
  @IsUUID('all', { message: 'departmentId must be a valid UUID.' })
  departmentId?: string;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000003',
    description: 'Team ID',
  })
  @IsOptional()
  @IsUUID('all', { message: 'teamId must be a valid UUID.' })
  teamId?: string;

  @ApiProperty({
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
    description: 'Priority level of the task',
  })
  @IsEnum(TaskPriority, {
    message: 'priority must be one of: LOW, MEDIUM, HIGH, URGENT',
  })
  @IsNotEmpty({ message: 'priority is required.' })
  priority!: TaskPriority;

  @ApiPropertyOptional({
    example: '2026-12-01T18:00:00.000Z',
    description: 'Due date for task completion (ISO-8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO-8601 date string.' })
  dueDate?: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    description: 'Updated task workflow status',
  })
  @IsEnum(TaskStatus, {
    message: 'status must be one of: TODO, IN_PROGRESS, UNDER_REVIEW, DONE, CANCELLED',
  })
  @IsNotEmpty({ message: 'status is required.' })
  status!: TaskStatus;
}

export class AssignTaskDto {
  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'ProfileEmployee ID to assign the task to (or null to unassign)',
  })
  @IsOptional()
  @IsUUID('all', { message: 'assignedToId must be a valid UUID.' })
  assignedToId?: string | null;
}

export class QueryTasksDto {
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

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned employee UUID' })
  @IsOptional()
  @IsUUID('all')
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by department UUID' })
  @IsOptional()
  @IsUUID('all')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by team UUID' })
  @IsOptional()
  @IsUUID('all')
  teamId?: string;

  @ApiPropertyOptional({ description: 'Search term matching task title or description' })
  @IsOptional()
  @IsString()
  search?: string;
}
