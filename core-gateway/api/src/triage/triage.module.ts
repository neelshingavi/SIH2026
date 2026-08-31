import { Module } from '@nestjs/common';
import { TriageService } from './triage.service.js';
import { TriageController } from './triage.controller.js';

import { FhirModule } from '../fhir/fhir.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [FhirModule, AuditModule],
  controllers: [TriageController],
  providers: [TriageService],
})
export class TriageModule {}
