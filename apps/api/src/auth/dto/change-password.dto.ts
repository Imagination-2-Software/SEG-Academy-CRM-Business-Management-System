import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldSecureP@ss123!',
    description: 'Current account password for identity verification',
  })
  @IsString({ message: 'Current password must be a string.' })
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecureP@ss456!',
    description: 'New account password (minimum 8 characters)',
  })
  @IsString({ message: 'New password must be a string.' })
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @MaxLength(128, { message: 'New password cannot exceed 128 characters.' })
  newPassword!: string;
}
