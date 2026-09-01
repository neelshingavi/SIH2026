import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PatientService } from './patient.service.js';
import { PatientController } from './patient.controller.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [HttpModule, QueueModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
