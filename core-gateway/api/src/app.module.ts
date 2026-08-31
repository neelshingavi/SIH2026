import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'hapi',
      entities: [StockItem, StockMovement, FhirResource, SyncIdempotency, User, AuditEvent],
      synchronize: true, // Use only in development
    }),
    SyncModule, TriageModule, TeleconsultModule, StockModule, DiagnosticsModule, PatientModule, QueueModule, ReferralModule, AnalyticsModule,
    UsersModule, AuthModule, AuditModule, FhirModule, CareGapModule, CarePathwayModule, AlertModule,
    ConsentModule, HieModule, AbdmModule, HealthModule
  ],
  controllers: [AppController],
  providers: [AppService],
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
