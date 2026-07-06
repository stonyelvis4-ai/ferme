import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { SanitaryModule } from '../sanitary/sanitary.module.js';
import { LivestockController } from './livestock.controller.js';
import { LivestockService } from './livestock.service.js';

@Module({
  imports: [AuthModule, FarmsModule, SanitaryModule],
  controllers: [LivestockController],
  providers: [LivestockService]
})
export class LivestockModule {}
