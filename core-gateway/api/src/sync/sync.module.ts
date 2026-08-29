import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncService } from './sync.service.js';
import { SyncController } from './sync.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
