import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { TriageService } from './triage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('triage')
@UseGuards(JwtAuthGuard)
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  @Post('evaluate')
  evaluate(
    @Body('encounterId') encounterId: string,
    @Req() req: any
  ) {
    return this.triageService.evaluateEncounter(encounterId, req.user, req.correlationId);
  }
}
