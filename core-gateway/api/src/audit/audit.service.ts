import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditEvent)
    private auditRepo: Repository<AuditEvent>,
  ) {}

  async logEvent(event: Partial<AuditEvent>) {
    try {
      const record = this.auditRepo.create(event);
      await this.auditRepo.save(record);
    } catch (e) {
      this.logger.error('Failed to write audit log', e);
    }
  }
}
