import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ReferralService } from './referral.service.js';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /referral?facilityId=PHC-001 */
  @Get()
  getAll(@Query('facilityId') facilityId?: string) {
    if (facilityId) return this.referralService.getForFacility(facilityId);
    return this.referralService.getAll();
  }

  /** POST /referral */
  @Post()
  create(@Body() body: {
    patientName: string;
    age?: string;
    gender?: string;
    fromFacilityId: string;
    toFacilityId: string;
    reason: string;
    notes?: string;
    priority?: string;
  }) {
    return this.referralService.create(body);
  }

  /** PATCH /referral/:id/advance */
  @Patch(':id/advance')
  advance(@Param('id') id: string) {
    return this.referralService.advance(id);
  }

  /** POST /referral/seed?facilityId=PHC-001 */
  @Post('seed')
  seed(@Query('facilityId') facilityId: string) {
    return this.referralService.seed(facilityId);
  }
}
