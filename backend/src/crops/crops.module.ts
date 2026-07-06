import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsModule } from '../farms/farms.module.js';
import { CropsController } from './crops.controller.js';
import { CropsService } from './crops.service.js';

@Module({
  imports: [AuthModule, FarmsModule],
  controllers: [CropsController],
  providers: [CropsService]
})
export class CropsModule {}
