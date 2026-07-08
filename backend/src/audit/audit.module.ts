import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../shared/database/prisma.module.js';
import { AuditController } from './audit.controller.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { AuditService } from './audit.service.js';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ],
  exports: [AuditService]
})
export class AuditModule {}
