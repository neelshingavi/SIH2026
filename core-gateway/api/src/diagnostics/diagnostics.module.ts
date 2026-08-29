import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiagnosticsService } from './diagnostics.service.js';
import { DiagnosticsController } from './diagnostics.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
})
export class DiagnosticsModule {}
