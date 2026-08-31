import { Controller, Post, Get, Body, Param, UseGuards, Req, Put, ForbiddenException } from '@nestjs/common';
import { ConsentService } from './consent.service.js';
import { BreakGlassService } from './break-glass.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('consent')
export class ConsentController {
  constructor(
    private readonly consentService: ConsentService,
    private readonly breakGlassService: BreakGlassService
  ) {}

  @Post('emergency/:patientId')
  async emergencyOverride(@Req() req: any, @Param('patientId') patientId: string, @Body('reason') reason: string) {
    if (!reason) throw new ForbiddenException('Reason required for emergency override');
    return this.breakGlassService.emergencyAccess(patientId, reason, req.user, req.correlationId);
  }

  @Post()
  async createConsent(@Req() req: any, @Body() body: any) {
    return this.consentService.recordConsent(body, req.user, req.correlationId);
  }

  @Get('patient/:patientId')
  async getPatientConsents(@Param('patientId') patientId: string) {
    return this.consentService.getConsentsForPatient(patientId);
  }

  @Put(':id/revoke')
  async revokeConsent(@Req() req: any, @Param('id') consentId: string, @Body('reason') reason: string) {
    return this.consentService.revokeConsent(consentId, reason, req.user, req.correlationId);
  }
}
