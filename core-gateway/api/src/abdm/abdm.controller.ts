import { Controller, Get, Param, UseGuards, Req, Post, Body } from '@nestjs/common';
import { AbdmGatewayService } from './abdm-gateway.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { HieOutboxService } from '../hie/hie-outbox.service.js';

@UseGuards(JwtAuthGuard)
@Controller('abdm')
export class AbdmController {
  constructor(
    private readonly abdmGateway: AbdmGatewayService,
    private readonly outboxService: HieOutboxService
  ) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    if (req.user.role !== 'DISTRICT_ADMIN') {
      throw new Error('Unauthorized. District Admin access required.');
    }
    return this.outboxService.getMetrics();
  }

  @Get('status')
  async getStatus() {
    return { mode: this.abdmGateway.getMode() };
  }

  @Post('abha/verify')
  async verifyAbha(@Body() body: any) {
    return this.abdmGateway.verifyAbha(body.abhaNumber);
  }
}
