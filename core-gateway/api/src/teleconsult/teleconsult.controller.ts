import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { TeleconsultService } from './teleconsult.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('teleconsult')
@UseGuards(JwtAuthGuard)
export class TeleconsultController {
  constructor(private readonly teleconsultService: TeleconsultService) {}

  @Post('token')
  async getToken(@Body() body: { taskId: string }, @Req() req: any) {
    return this.teleconsultService.createToken(body.taskId, req.user, req.correlationId);
  }

  @Get('waiting-room')
  getWaitingRoom(@Req() req: any) {
    return this.teleconsultService.getWaitingRoom(req.user.facilityId);
  }

  @Post(':id/complete')
  async completeConsultation(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Req() req: any
  ) {
    return this.teleconsultService.completeConsultation(id, notes, req.user, req.correlationId);
  }
}

