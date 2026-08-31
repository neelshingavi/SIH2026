import { Module } from '@nestjs/common';
import { CarePathwayService } from './care-pathway.service.js';
import { FhirModule } from '../fhir/fhir.module.js';

@Module({
  imports: [FhirModule],
  providers: [CarePathwayService],
  exports: [CarePathwayService],
})
export class CarePathwayModule {}
