import { Injectable, Logger } from '@nestjs/common';
import { HieService } from './hie.service.js';
import * as crypto from 'crypto';

export type ExchangeStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REQUIRES_REVIEW';
export type Priority = 'EMERGENCY' | 'STAT' | 'URGENT' | 'ROUTINE';

export interface ExchangeTask {
  exchangeId: string;
  idempotencyKey: string;
  patientId: string;
  recipientFacilityId: string;
  purpose: string;
  priority: Priority;
  status: ExchangeStatus;
  retryCount: number;
  user: any;
  correlationId: string;
  createdAt: Date;
}

@Injectable()
export class HieOutboxService {
  private readonly logger = new Logger(HieOutboxService.name);
  private queue: ExchangeTask[] = [];
  private isProcessing = false;

  constructor(private readonly hieService: HieService) {
    // Start background processor
    setInterval(() => this.processQueue(), 5000);
  }

  queueExport(patientId: string, recipientFacilityId: string, purpose: string, priority: Priority, user: any, correlationId: string, idempotencyKey: string) {
    // 1. Idempotency Check
    const existing = this.queue.find(t => t.idempotencyKey === idempotencyKey);
    if (existing) {
      this.logger.log(`Exchange for idempotencyKey \${idempotencyKey} is already \${existing.status}`);
      return { exchangeId: existing.exchangeId, status: existing.status };
    }

    const exchangeId = crypto.randomUUID();
    const task: ExchangeTask = {
      exchangeId,
      idempotencyKey,
      patientId,
      recipientFacilityId,
      purpose,
      priority,
      status: 'PENDING',
      retryCount: 0,
      user,
      correlationId,
      createdAt: new Date(),
    };

    this.queue.push(task);
    this.logger.log(`Queued HIE export \${exchangeId} with priority \${priority}`);
    
    // Sort queue by priority: EMERGENCY > STAT > URGENT > ROUTINE
    this.queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    // Kick off processing immediately if not running
    if (!this.isProcessing) {
       this.processQueue();
    }

    return { exchangeId, status: 'PENDING' };
  }

  private getPriorityWeight(priority: Priority): number {
    switch (priority) {
      case 'EMERGENCY': return 4;
      case 'STAT': return 3;
      case 'URGENT': return 2;
      case 'ROUTINE': return 1;
      default: return 0;
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingTasks = this.queue.filter(t => t.status === 'PENDING' || (t.status === 'FAILED' && t.retryCount < 3));

      for (const task of pendingTasks) {
        task.status = 'PROCESSING';
        try {
          // Attempt the actual export via HieService
          await this.hieService.exportClinicalSummary(
            task.patientId, 
            task.recipientFacilityId, 
            task.purpose, 
            task.user, 
            task.correlationId
          );
          task.status = 'COMPLETED';
        } catch (error) {
          this.logger.error(`Failed to process HIE export \${task.exchangeId}: \${error.message}`);
          task.retryCount++;
          task.status = task.retryCount >= 3 ? 'REQUIRES_REVIEW' : 'FAILED';
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  getMetrics() {
    const completed = this.queue.filter(t => t.status === 'COMPLETED').length;
    const failed = this.queue.filter(t => t.status === 'FAILED' || t.status === 'REQUIRES_REVIEW').length;
    const pending = this.queue.filter(t => t.status === 'PENDING').length;

    return {
      recordsShared: completed,
      exchangeSuccessRate: this.queue.length > 0 ? (completed / this.queue.length) * 100 : 100,
      exchangeFailureRate: this.queue.length > 0 ? (failed / this.queue.length) * 100 : 0,
      pendingExchanges: pending,
      totalExchanges: this.queue.length
    };
  }
}
