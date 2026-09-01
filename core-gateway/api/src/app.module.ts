import * as dotenv from 'dotenv';
dotenv.config();
import { Module, MiddlewareConsumer, NestModule, Global, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SyncModule } from './sync/sync.module.js';
import { TriageModule } from './triage/triage.module.js';
import { TeleconsultModule } from './teleconsult/teleconsult.module.js';
import { StockModule } from './stock/stock.module.js';
import { DiagnosticsModule } from './diagnostics/diagnostics.module.js';
import { PatientModule } from './patient/patient.module.js';
import { QueueModule } from './queue/queue.module.js';
import { ReferralModule } from './referral/referral.module.js';

import { StockItem } from './stock/entities/stock.entity.js';
import { StockMovement } from './stock/entities/stock-movement.entity.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { FhirResource } from './sync/entities/fhir-resource.entity.js';
import { SyncIdempotency } from './sync/entities/sync-idempotency.entity.js';

import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { User } from './users/entities/user.entity.js';
import { AuditEvent } from './audit/entities/audit-event.entity.js';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware.js';
import { FhirModule } from './fhir/fhir.module.js';
import { CareGapModule } from './care-gap/care-gap.module.js';
import { CarePathwayModule } from './care-pathway/care-pathway.module.js';
import { AlertModule } from './alert/alert.module.js';
import { ConsentModule } from './consent/consent.module.js';
import { HieModule } from './hie/hie.module.js';
import { AbdmModule } from './abdm/abdm.module.js';
import { HealthModule } from './health/health.module.js';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware.js';
import { TerminologyService } from './common/terminology/terminology.service.js';
import { StructuredLogger } from './common/logger/structured-logger.service.js';

import { QueueEntry } from './queue/entities/queue.entity.js';
import { DiagnosticOrder } from './diagnostics/entities/diagnostic.entity.js';
import { ReferralEntry } from './referral/entities/referral-entry.entity.js';
import { PrescriptionModule } from './prescription/prescription.module.js';
import { PrescriptionEntry } from './prescription/entities/prescription-entry.entity.js';
import { SmsModule } from './sms/sms.module.js';

@Global()
@Module({
  providers: [TerminologyService],
  exports: [TerminologyService],
})
export class TerminologyModule {}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USER || 'hapi',
      password: process.env.DB_PASSWORD || 'hapi_password',
      database: process.env.DB_NAME || 'hapi',
      entities: [StockItem, StockMovement, FhirResource, SyncIdempotency, User, AuditEvent, QueueEntry, DiagnosticOrder, ReferralEntry, PrescriptionEntry],
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production', // Disabled in production
    }),
    SyncModule, TriageModule, TeleconsultModule, StockModule, DiagnosticsModule, PatientModule, QueueModule, ReferralModule, AnalyticsModule,
    UsersModule, AuthModule, AuditModule, FhirModule, CareGapModule, CarePathwayModule, AlertModule,
    ConsentModule, HieModule, AbdmModule, HealthModule, TerminologyModule, PrescriptionModule, SmsModule
  ],
  controllers: [AppController],
  providers: [AppService, StructuredLogger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes(
        { path: 'sync/*', method: RequestMethod.ALL },
        { path: 'auth/*', method: RequestMethod.ALL },
        { path: 'patient/*', method: RequestMethod.ALL },
        { path: 'referral/*', method: RequestMethod.ALL },
        { path: 'exchange/*', method: RequestMethod.ALL }
      );
  }
}
