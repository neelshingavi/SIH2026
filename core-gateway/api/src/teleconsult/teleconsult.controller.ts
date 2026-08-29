import { Controller, Post, Body, Get, Query, Patch, Param } from '@nestjs/common';
import { TeleconsultService } from './teleconsult.service.js';

@Controller('teleconsult')
export class TeleconsultController {
  constructor(private readonly teleconsultService: TeleconsultService) {}

  @Post('token')
  async getToken(@Body() body: { roomName: string; participantName: string; isDoctor: boolean }) {
    return this.teleconsultService.createToken(body.roomName, body.participantName, body.isDoctor);
  }

  @Get('queue')
  getQueue(@Query('hubFacilityId') hubFacilityId: string) {
    return this.teleconsultService.getQueue(hubFacilityId);
  }

  @Post('queue')
  createRequest(@Body() body: { hubFacilityId: string; spokeFacilityId: string; patientName: string; condition: string; priority: string }) {
    return this.teleconsultService.createRequest(body);
  }

  @Patch('queue/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.teleconsultService.updateStatus(id, status);
  }

  @Post('seed')
  seed(@Query('hubFacilityId') hubFacilityId: string) {
    return this.teleconsultService.seed(hubFacilityId);
  }
}
