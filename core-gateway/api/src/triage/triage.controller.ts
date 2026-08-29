import { Controller, Post, Body } from '@nestjs/common';
import { TriageService } from './triage.service.js';

export interface EvaluateDto {
  patientId: string;
  encounterType: string;
  observations: any[];
}

@Controller('triage')
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post('evaluate')
  evaluate(@Body() evaluateDto: EvaluateDto) {
    return this.triageService.evaluate(evaluateDto);
  }
}
