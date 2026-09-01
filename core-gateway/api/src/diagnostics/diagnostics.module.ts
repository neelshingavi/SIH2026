import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticsService } from './diagnostics.service.js';
import { DiagnosticsController } from './diagnostics.controller.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { DiagnosticOrder } from './entities/diagnostic.entity.js';

@Module({
  imports: [FhirModule, TypeOrmModule.forFeature([DiagnosticOrder])],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
