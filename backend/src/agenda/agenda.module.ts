import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AgendaController } from './agenda.controller.js';
import { AgendaService } from './agenda.service.js';

@Module({
  imports: [AuthModule, FarmsModule, NotificationsModule],
  controllers: [AgendaController],
  providers: [AgendaService]
})
export class AgendaModule {}
