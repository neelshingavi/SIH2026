import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { SyncService } from './sync.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FacilityScopeGuard } from '../auth/guards/facility-scope.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';

export interface SyncOperationDto {
  operationId: string;
  operation: string; // 'CREATE' | 'UPDATE' | 'DELETE'
  idempotencyKey: string;
  resource: {
    id: string;
    resourceType: string;
    json: string;
    versionId: number;
    updatedAt: string;
    createdBy: string;
    facilityId: string;
    isDeleted: boolean;
  };
}

@Controller('sync')
@UseGuards(JwtAuthGuard, FacilityScopeGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @Roles(Role.ASHA, Role.ANM, Role.CHO, Role.MEDICAL_OFFICER)
  push(@Body() operations: SyncOperationDto[], @Req() req: any) {
    return this.syncService.push(operations, req.user, req.correlationId);
  }

  @Get('pull')
  pull(@Query('since') since: string, @Req() req: any) {
    return this.syncService.pull(since, req.user);
  }

  @Get('tasks')
  getTasks() {
    return this.syncService.getTasks();
  }
}


