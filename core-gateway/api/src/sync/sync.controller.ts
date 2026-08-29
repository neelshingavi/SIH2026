import { Controller, Post, Get, Body, Query, Version } from '@nestjs/common';
import { SyncService } from './sync.service.js';

export interface SyncResource {
  id: string;
  resourceType: string;
  json: string;
  versionId: number;
  updatedAt: string;
  createdBy: string;
}

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(@Body() resources: SyncResource[]) {
    return this.syncService.push(resources);
  }

  @Get('pull')
  pull(@Query('since') since: string) {
    return this.syncService.pull(since);
  }

  @Get('tasks')
  getTasks() {
    return this.syncService.getTasks();
  }
}
