import { Module } from '@nestjs/common';
import { HieController } from './hie.controller.js';
import { HieService } from './hie.service.js';
import { HieOutboxService } from './hie-outbox.service.js';
import { PatientIdentityService } from './patient-identity.service.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { ConsentModule } from '../consent/consent.module.js';
import { AbdmModule } from '../abdm/abdm.module.js';

@Module({
  imports: [FhirModule, AuditModule, ConsentModule, AbdmModule],
  controllers: [HieController],
  providers: [HieService, HieOutboxService, PatientIdentityService],
  exports: [HieService, HieOutboxService, PatientIdentityService],
})
export class HieModule {}
