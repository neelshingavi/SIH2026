import { Controller, Get, Post, Body, Param } from '@nestjs/common';

@Controller('diagnostics')
export class DiagnosticsController {
  @Post('order')
  orderTest(@Body() body: any) {
    // Scaffold for diagnostic ServiceRequest
    return {
      status: 'ordered',
      orderId: `diag-${Date.now()}`
    };
  }

  @Get('result/:id')
  getResult(@Param('id') id: string) {
    // Scaffold for DiagnosticReport
    return {
      id: id,
      status: 'final',
      results: [
        { test: 'Hemoglobin', value: 12.5, unit: 'g/dL' }
      ]
    };
  }
}
