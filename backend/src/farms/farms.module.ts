import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FarmsController } from './farms.controller.js';
import { FarmsService } from './farms.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService]
})
export class FarmsModule {}
