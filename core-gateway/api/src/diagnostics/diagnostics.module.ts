import { Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service.js';
import { DiagnosticsController } from './diagnostics.controller.js';
import { FhirModule } from '../fhir/fhir.module.js';

@Module({
  imports: [FhirModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
