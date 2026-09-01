import { Controller, Post, Get, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { HieService } from './hie.service.js';
import { HieOutboxService } from './hie-outbox.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hie')
export class HieController {
  constructor(
    private readonly hieService: HieService,
    private readonly outboxService: HieOutboxService
  ) {}

  // Phase 12: Full export workflow — consent checked, bundle generated, outbox queued
  @Post('export')
  @Roles('ASHA', 'ANM', 'MO', 'SPECIALIST')
  async exportRecord(@Req() req: any, @Body() body: any) {
    const { patientId, purpose, recipientFacilityId, priority, idempotencyKey } = body;
    if (!patientId || !purpose || !recipientFacilityId || !idempotencyKey) {
      throw new ForbiddenException('Missing required fields for export');
    }
    return this.outboxService.queueExport(
      patientId, 
      recipientFacilityId, 
      purpose, 
      priority || 'ROUTINE', 
      req.user, 
      req.correlationId, 
      idempotencyKey
    );
  }

  // Phase 43: Exchange status endpoint — can check delivery state
  @Get('exchange/:exchangeId')
  @Roles('ASHA', 'ANM', 'MO', 'SPECIALIST', 'ADMIN')
  async getExchangeStatus(@Param('exchangeId') exchangeId: string) {
    const task = this.outboxService.getExchangeById(exchangeId);
    if (!task) {
      throw new ForbiddenException('Exchange not found');
    }
    // Phase 45: Return operator-safe view (no PHI in status)
    return {
      exchangeId: task.exchangeId,
      status: task.status,
      priority: task.priority,
      purpose: task.purpose,
      recipientFacilityId: task.recipientFacilityId,
      createdAt: task.createdAt,
      retryCount: task.retryCount,
    };
  }

  // Phase 37: HIE Metrics endpoint (no PHI)
  @Get('metrics')
  @Roles('MO', 'ADMIN', 'DISTRICT_ADMIN')
  async getMetrics() {
    return this.outboxService.getMetrics();
  }

  // Phase 17: Dead Letter Queue (DLQ) endpoint
  @Get('dlq')
  @Roles('ADMIN', 'DISTRICT_ADMIN')
  async getDeadLetterQueue() {
    return this.outboxService.getDeadLetterQueue();
  }

  // Phase 19: Import — external FHIR data passes through identity resolution, deduplication, consent
  @Post('import')
  @Roles('MO', 'SPECIALIST', 'ADMIN')
  async importRecord(@Req() req: any, @Body() body: any) {
    return this.hieService.importClinicalSummary(body, req.user, req.correlationId);
  }

  // Phase 54: Clinical summary export (full patient summary for authorized user)
  @Get('summary/:patientId')
  @Roles('MO', 'SPECIALIST', 'ADMIN')
  async getClinicalSummary(@Req() req: any, @Param('patientId') patientId: string) {
    return this.hieService.exportClinicalSummary(
      patientId,
      req.user.facilityId,
      'TREATMENT',
      req.user,
      req.correlationId
    );
  }
}
