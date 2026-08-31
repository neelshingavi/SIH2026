import { Module } from '@nestjs/common';
import { AlertService } from './alert.service.js';
import { FhirModule } from '../fhir/fhir.module.js';

@Module({
  imports: [FhirModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
