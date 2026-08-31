import { Controller, Get, Req, UseGuards, Patch, Param, Body } from '@nestjs/common';
import { CareGapService } from './care-gap.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('care-gaps')
@UseGuards(JwtAuthGuard)
export class CareGapController {
  constructor(private readonly careGapService: CareGapService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.careGapService.getDashboard(req.user.facilityId);
  }

  @Patch('followup/:id')
  updateFollowup(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @Req() req: any
  ) {
    return this.careGapService.updateFollowup(id, status, notes, req.user, req.correlationId);
  }
}
