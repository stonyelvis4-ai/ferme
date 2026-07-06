import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { FacilitiesController } from './facilities.controller.js';
import { FacilitiesService } from './facilities.service.js';

@Module({
  imports: [AuthModule, FarmsModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService]
})
export class FacilitiesModule {}
