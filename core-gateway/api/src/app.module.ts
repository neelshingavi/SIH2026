import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SyncModule } from './sync/sync.module.js';
import { TriageModule } from './triage/triage.module.js';
import { TeleconsultModule } from './teleconsult/teleconsult.module.js';
import { StockModule } from './stock/stock.module.js';
import { AbdmMockModule } from './abdm-mock/abdm-mock.module.js';
import { DiagnosticsModule } from './diagnostics/diagnostics.module.js';
import { PatientModule } from './patient/patient.module.js';
import { QueueModule } from './queue/queue.module.js';
import { ReferralModule } from './referral/referral.module.js';

import { StockItem } from './stock/entities/stock.entity.js';
import { StockMovement } from './stock/entities/stock-movement.entity.js';
import { QueueEntry } from './queue/entities/queue.entity.js';
import { Referral } from './referral/entities/referral.entity.js';
import { Teleconsult } from './teleconsult/entities/teleconsult.entity.js';
import { AnalyticsModule } from './analytics/analytics.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'hapi',
      entities: [StockItem, StockMovement, QueueEntry, Referral, Teleconsult],
      synchronize: true, // Use only in development
    }),
    SyncModule, TriageModule, TeleconsultModule, StockModule, AbdmMockModule, DiagnosticsModule, PatientModule, QueueModule, ReferralModule, AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
