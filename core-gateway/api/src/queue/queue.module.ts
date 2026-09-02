import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service.js';
import { QueueGateway } from './queue.gateway.js';
import { QueueController } from './queue.controller.js';
import { QueueEntry } from './entities/queue.entity.js';
import { FhirModule } from '../fhir/fhir.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([QueueEntry]), FhirModule],
  controllers: [QueueController],
  providers: [QueueGateway, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
