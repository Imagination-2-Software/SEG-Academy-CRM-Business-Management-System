import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'Academic Faculty',
    description: 'Unique name of the department',
  })
  @IsString({ message: 'Department name must be a string.' })
  @IsNotEmpty({ message: 'Department name is required.' })
  @MinLength(2, { message: 'Department name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Department name cannot exceed 100 characters.' })
  name!: string;

  @ApiProperty({
    example: 'ACAD',
    description: 'Unique uppercase code for the department',
  })
  @IsString({ message: 'Department code must be a string.' })
  @IsNotEmpty({ message: 'Department code is required.' })
  @MinLength(2, { message: 'Department code must be at least 2 characters.' })
  @MaxLength(20, { message: 'Department code cannot exceed 20 characters.' })
  code!: string;

  @ApiPropertyOptional({
    example: 'Manages curriculum delivery and academic training',
    description: 'Optional description of the department',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string.' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters.' })
  description?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
