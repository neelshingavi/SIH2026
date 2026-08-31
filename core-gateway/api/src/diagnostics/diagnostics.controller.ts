import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service.js';

@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get('orders')
  getOrders() {
    return this.diagnosticsService.getOrders();
  }

  @Post('order')
  orderTest(@Body() body: any) {
    return this.diagnosticsService.orderTest(
      body.patientId || 'pat-123',
      body.testCode || '1234-5',
      body.testName || 'General Lab Test',
      body.providerId || 'MO-1',
      body.destinationFacilityId || 'PHC-001'
    );
  }

  @Post(':id/result')
  submitResult(@Param('id') id: string, @Body() body: any) {
    return this.diagnosticsService.submitResult(
      id,
      body.resultValue || 0,
      body.resultUnit || '',
      body.testName || 'General Lab Test'
    );
  }
}
