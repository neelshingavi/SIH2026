import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FhirService } from './fhir.service.js';

@Module({
  imports: [HttpModule],
  providers: [FhirService],
  exports: [FhirService],
})
export class FhirModule {}
