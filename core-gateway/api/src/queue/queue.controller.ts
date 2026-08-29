import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { QueueService } from './queue.service.js';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /** GET /queue?facilityId=PHC-001 — fetch ordered queue */
  @Get()
  getQueue(@Query('facilityId') facilityId: string) {
    return this.queueService.getQueueByFacility(facilityId);
  }

  /** POST /queue — register a new patient into the queue */
  @Post()
  createEntry(
    @Body() body: {
      facilityId: string;
      patientName: string;
      age: string;
      gender: string;
      chiefComplaint: string;
      priority: string;
      bpVital?: string;
      spo2Vital?: string;
      tempVital?: string;
    },
  ) {
    return this.queueService.createEntry(body);
  }

  /** PATCH /queue/:id/advance — advance a patient to the next status */
  @Patch(':id/advance')
  advance(@Param('id') id: string) {
    return this.queueService.advanceStatus(id);
  }

  /** POST /queue/seed?facilityId=PHC-001 — seed demo data */
  @Post('seed')
  seed(@Query('facilityId') facilityId: string) {
    return this.queueService.seedFacility(facilityId);
  }
}
