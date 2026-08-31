import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { FhirModule } from '../fhir/fhir.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [FhirModule],
  controllers: [HealthController],
})
export class HealthModule {}
