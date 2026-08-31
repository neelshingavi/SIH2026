import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  async getReferrals(
    @Query('direction') direction: 'incoming' | 'outgoing',
    @Query('status') status: string,
    @Query('priority') priority: string,
    @Query('patientId') patientId: string,
    @Req() req: any
  ) {
    const isIncoming = direction === 'incoming';
    const filters = { status, priority, patientId };
    const tasks = await this.referralService.searchReferrals(req.user.facilityId, req.user.role, isIncoming, filters);
    
    // SLA Engine: Dynamically attach SLA status
    return tasks.map((task: any) => {
      let slaStatus = 'ON_TRACK';
      if (task.authoredOn) {
        const hoursSince = (new Date().getTime() - new Date(task.authoredOn).getTime()) / (1000 * 60 * 60);
        // If it's a stat/emergency priority, SLA is much tighter (1 hour limit)
        const limit = task.priority === 'stat' ? 1 : task.priority === 'urgent' ? 24 : 72;
        if (hoursSince > limit) slaStatus = 'BREACHED';
        else if (hoursSince > limit * 0.75) slaStatus = 'WARNING';
      }
      return { ...task, slaStatus };
    });
  }

  @Get('destinations')
  getDestinations(@Query('service') serviceType: string) {
    return this.referralService.getDestinations(serviceType);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string, 
    @Body('status') status: string,
    @Req() req: any
  ) {
    return this.referralService.updateStatus(id, status, req.user, req.correlationId);
  }

  @Get(':id/packet')
  getReferralPacket(@Param('id') id: string) {
    return this.referralService.getReferralPacket(id);
  }
}


