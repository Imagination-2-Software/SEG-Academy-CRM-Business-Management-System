import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import { TokenStorageService } from './token-storage.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, EmailModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    PasswordResetService,
    TokenStorageService,
  ],
  exports: [
    AuthService,
    PasswordService,
    TokenService,
    PasswordResetService,
    TokenStorageService,
  ],
})
export class AuthModule {}
