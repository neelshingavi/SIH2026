import { Module } from '@nestjs/common';
import { CareGapController } from './care-gap.controller.js';
import { CareGapService } from './care-gap.service.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { CarePathwayModule } from '../care-pathway/care-pathway.module.js';

@Module({
  imports: [FhirModule, CarePathwayModule],
  controllers: [CareGapController],
  providers: [CareGapService],
  exports: [CareGapService],
})
export class CareGapModule {}
