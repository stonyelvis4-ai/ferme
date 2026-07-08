import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { SessionUser } from '../auth/auth.service.js';
import { AuditService } from './audit.service.js';

class AuditQueryDto {
  @IsOptional()
  @IsString()
  farmId?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsIn(['CREATION', 'MODIFICATION', 'SUPPRESSION', 'ARCHIVAGE', 'CONNEXION', 'DECONNEXION', 'VENTE', 'PAIEMENT', 'TACHE', 'ALERTE', 'SYNC'])
  actionType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit/logs')
  async listLogs(@CurrentUser() user: SessionUser, @Query() query: AuditQueryDto) {
    return this.auditService.listLogs(user, query);
  }

  @Get('audit/users/:userId/history')
  async listUserHistory(@Param('userId') userId: string) {
    return this.auditService.listUserHistory(userId);
  }
}
