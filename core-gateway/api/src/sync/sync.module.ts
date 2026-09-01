import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';
import { FhirResource } from './entities/fhir-resource.entity.js';
import { SyncIdempotency } from './entities/sync-idempotency.entity.js';
import { HieModule } from '../hie/hie.module.js';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([FhirResource, SyncIdempotency]),
    HieModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
