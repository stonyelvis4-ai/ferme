import { Module } from '@nestjs/common';
import { AgendaModule } from './agenda/agenda.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AlertsModule } from './alerts/alerts.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CropsModule } from './crops/crops.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { FacilitiesModule } from './facilities/facilities.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { FarmsModule } from './farms/farms.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { LivestockModule } from './livestock/livestock.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ProductionModule } from './production/production.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SanitaryModule } from './sanitary/sanitary.module.js';
import { PrismaModule } from './shared/database/prisma.module.js';
import { JobsModule } from './shared/jobs/jobs.module.js';
import { SyncModule } from './sync/sync.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
    AuthModule,
    CropsModule,
    DashboardModule,
    FacilitiesModule,
    FarmsModule,
    FinanceModule,
    LivestockModule,
    NotificationsModule,
    ProductionModule,
    RecommendationsModule,
    ReportsModule,
    SanitaryModule,
    AgendaModule,
    AuditModule,
    AlertsModule,
    InventoryModule,
    SettingsModule,
    SyncModule,
    UsersModule
  ]
})
export class AppModule {}
