import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupFounderDto {
  @ApiProperty({
    example: 'Dr. Sarah Jenkins',
    description: 'Official full name of the Founder / Super Admin',
  })
  @IsString({ message: 'Full name must be a string.' })
  @IsNotEmpty({ message: 'Full name is required.' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Full name cannot exceed 100 characters.' })
  fullName!: string;

  @ApiProperty({
    example: 'founder@segacademy.com',
    description: 'Official organizational email address of the Founder',
  })
  @IsEmail({}, { message: 'Must be a valid official email address.' })
  @IsNotEmpty({ message: 'Official email is required.' })
  email!: string;

  @ApiProperty({
    example: 'P@ssw0rdSecure2026!',
    description: 'Strong password meeting enterprise security requirements (min 10 chars, uppercase, lowercase, digit, special char)',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(10, { message: 'Password must be at least 10 characters long.' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.',
    },
  )
  password!: string;
}
