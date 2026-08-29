import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PatientService } from './patient.service.js';
import { PatientController } from './patient.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
