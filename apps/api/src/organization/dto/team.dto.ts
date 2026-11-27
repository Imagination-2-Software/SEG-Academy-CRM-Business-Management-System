import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({
    example: 'Full Stack Engineering',
    description: 'Name of the team within the department',
  })
  @IsString({ message: 'Team name must be a string.' })
  @IsNotEmpty({ message: 'Team name is required.' })
  @MinLength(2, { message: 'Team name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Team name cannot exceed 100 characters.' })
  name!: string;

  @ApiProperty({
    example: 'ENG-FS',
    description: 'Unique uppercase code for the team',
  })
  @IsString({ message: 'Team code must be a string.' })
  @IsNotEmpty({ message: 'Team code is required.' })
  @MinLength(2, { message: 'Team code must be at least 2 characters.' })
  @MaxLength(20, { message: 'Team code cannot exceed 20 characters.' })
  code!: string;

  @ApiProperty({
    example: '00000000-0000-0000-0000-000000000001',
    description: 'ID of the parent department',
  })
  @IsUUID('all', { message: 'departmentId must be a valid UUID.' })
  @IsNotEmpty({ message: 'departmentId is required.' })
  departmentId!: string;

  @ApiPropertyOptional({
    example: 'Handles full stack curriculum delivery and student projects',
    description: 'Optional description of the team',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters.' })
  description?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
