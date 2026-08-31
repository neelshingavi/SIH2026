import { Module } from '@nestjs/common';
import { CareGapController } from './care-gap.controller.js';
import { CareGapService } from './care-gap.service.js';
import { FhirModule } from '../fhir/fhir.module.js';

@Module({
  imports: [FhirModule],
  controllers: [CareGapController],
  providers: [CareGapService],
  exports: [CareGapService],
})
export class CareGapModule {}
