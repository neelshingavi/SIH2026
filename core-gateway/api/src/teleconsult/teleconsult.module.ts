import { Module } from '@nestjs/common';
import { TeleconsultService } from './teleconsult.service.js';
import { TeleconsultController } from './teleconsult.controller.js';

@Module({
  imports: [],
  controllers: [TeleconsultController],
  providers: [TeleconsultService],
})
export class TeleconsultModule {}
