import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FhirService } from './fhir.service.js';

@Global()
@Module({
  imports: [HttpModule],
  providers: [FhirService],
  exports: [FhirService],
})
export class FhirModule {}
