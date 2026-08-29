import { Module } from '@nestjs/common';
import { TriageService } from './triage.service.js';
import { TriageController } from './triage.controller.js';

@Module({
  controllers: [TriageController],
  providers: [TriageService],
})
export class TriageModule {}
