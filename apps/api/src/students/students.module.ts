import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { DocumentStorageService } from './document-storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [StudentsController],
  providers: [StudentsService, DocumentStorageService],
  exports: [StudentsService, DocumentStorageService],
})
export class StudentsModule {}
