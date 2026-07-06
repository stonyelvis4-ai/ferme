import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';
import { TaskCategory } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { SessionUser } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AgendaService } from './agenda.service.js';

class CreateAgendaTaskDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority!: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsIn([
    'ALIMENTATION',
    'SANITAIRE',
    'PRODUCTION',
    'RECOLTE',
    'VENTE',
    'STOCK',
    'FINANCE',
    'MAINTENANCE',
    'CULTURE',
    'REPRODUCTION',
    'NETTOYAGE',
    'CONTROLE',
    'ADMINISTRATIF'
  ])
  category?: TaskCategory;

  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsIn(['A_FAIRE', 'EN_COURS', 'TERMINEE', 'EN_RETARD', 'ANNULEE'])
  status?: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';

  @IsOptional()
  @IsString()
  linkedModule?: string;

  @IsOptional()
  @IsString()
  linkedEntityType?: string;

  @IsOptional()
  @IsString()
  linkedEntityId?: string;

  @IsOptional()
  @IsString()
  linkedEntityLabel?: string;

  @IsOptional()
  @IsString()
  reminderPreset?: string;

  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
  repeatRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

  @IsOptional()
  @IsInt()
  @Min(1)
  repeatEvery?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateAgendaTaskStatusDto {
  @IsOptional()
  @IsIn(['A_FAIRE', 'EN_COURS', 'TERMINEE', 'EN_RETARD', 'ANNULEE'])
  status!: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/:farmId/agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  async getAgenda(@CurrentUser() user: SessionUser, @Param('farmId') farmId: string) {
    return this.agendaService.getFarmAgenda(user, farmId);
  }

  @Post('tasks')
  @Roles('ADMIN')
  async createTask(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Body() body: CreateAgendaTaskDto
  ) {
    return this.agendaService.createTask(user, farmId, body);
  }

  @Patch('tasks/:taskId')
  async updateTaskStatus(
    @CurrentUser() user: SessionUser,
    @Param('farmId') farmId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateAgendaTaskStatusDto
  ) {
    return this.agendaService.updateTask(user, farmId, taskId, body);
  }
}
