import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeleconsultService } from './teleconsult.service.js';
import { TeleconsultController } from './teleconsult.controller.js';
import { Teleconsult } from './entities/teleconsult.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Teleconsult])],
  controllers: [TeleconsultController],
  providers: [TeleconsultService],
})
export class TeleconsultModule {}
