import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PasswordService } from '../auth/password.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, PasswordService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
