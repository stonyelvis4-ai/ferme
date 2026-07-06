import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { getSecurityEnvConfig } from '../shared/config/security-env.js';

const securityEnv = getSecurityEnvConfig();

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30
      }
    ]),
    JwtModule.register({
      global: true,
      secret: securityEnv.jwtSecret,
      signOptions: { expiresIn: securityEnv.jwtExpiresIn as never }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}
