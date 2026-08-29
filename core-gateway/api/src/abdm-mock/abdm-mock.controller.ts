import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AbdmMockService } from './abdm-mock.service.js';

@Controller('abdm-mock')
export class AbdmMockController {
  constructor(private readonly abdmMockService: AbdmMockService) {}

  @Post('abha/create')
  createAbha() {
    return this.abdmMockService.createAbha();
  }

  @Post('consent/request')
  requestConsent(@Body() body: any) {
    return this.abdmMockService.requestConsent(body);
  }

  @Post('consent/:id/grant')
  grantConsent(@Param('id') id: string) {
    return this.abdmMockService.grantConsent(id);
  }

  @Get('care-context/:abhaId')
  fetchCareContext(@Param('abhaId') abhaId: string) {
    return this.abdmMockService.fetchCareContext(abhaId);
  }
}
