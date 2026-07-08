import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { SessionUser } from '../auth/auth.service.js';
import { SyncService } from './sync.service.js';

class SyncActionDto {
  @IsString()
  @MinLength(6)
  clientMutationId!: string;

  @IsString()
  module!: string;

  @IsString()
  entityType!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityLabel?: string;

  @IsIn(['CREATION', 'MODIFICATION', 'SUPPRESSION', 'ARCHIVAGE', 'VENTE', 'PAIEMENT', 'TACHE', 'ALERTE'])
  actionType!: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'ARCHIVAGE' | 'VENTE' | 'PAIEMENT' | 'TACHE' | 'ALERTE';

  @IsObject()
  payload!: Record<string, unknown>;
}

class SyncBatchDto {
  @IsOptional()
  @IsString()
  farmId?: string;

  @IsArray()
  actions!: SyncActionDto[];
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('sync')
  @Roles('ADMIN')
  async getSyncSummary(@CurrentUser() user: SessionUser, @Query('farmId') farmId?: string) {
    return this.syncService.getSyncSummary(user, farmId);
  }

  @Post('sync/batch')
  @Roles('ADMIN')
  async syncBatch(@CurrentUser() user: SessionUser, @Body() body: SyncBatchDto) {
    return this.syncService.syncBatch(user, body);
  }
}
