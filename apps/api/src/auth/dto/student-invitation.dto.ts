import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteStudentDto {
  @ApiProperty({
    example: 'stu_1234567890',
    description: 'Existing ProfileStudent ID to invite for student portal access',
  })
  @IsString()
  @IsNotEmpty()
  studentId!: string;
}

export class ActivateStudentDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Cryptographically random single-use invitation token sent to student email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    example: 'SecureStudentP@ss123!',
    description: 'Initial password establishing the student account credentials',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  password!: string;
}
