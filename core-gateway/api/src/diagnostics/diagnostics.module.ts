import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticsService } from './diagnostics.service.js';
import { DiagnosticsController } from './diagnostics.controller.js';
import { DiagnosticOrder } from './entities/diagnostic.entity.js';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DiagnosticOrder])
  ],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
