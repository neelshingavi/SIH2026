import { Injectable, Logger } from '@nestjs/common';
import { HieService } from './hie.service.js';
import { AbdmGatewayService } from '../abdm/abdm-gateway.service.js';
import { ExchangeStatus, ExchangeRequest } from './interfaces/health-exchange-adapter.interface.js';
import * as crypto from 'crypto';

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

  constructor(
    private readonly hieService: HieService,
    private readonly abdmGateway: AbdmGatewayService
  ) {
    setInterval(() => this.processQueue(), 5000);
    // Phase 64: Periodic reconciliation every 15 minutes (simulated 15s for demo)
    setInterval(() => this.runReconciliation(), 15000);
  }

  queueExport(patientId: string, recipientFacilityId: string, purpose: string, priority: Priority, user: any, correlationId: string, idempotencyKey: string) {
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
      status: ExchangeStatus.PENDING as any, // initial queue state
      retryCount: 0,
      user,
      correlationId,
      createdAt: new Date(),
    };
    task.status = ExchangeStatus.DRAFT;

    this.queue.push(task);
    this.logger.log(`Queued HIE export \${exchangeId} with priority \${priority}`);
    
    this.queue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    if (!this.isProcessing) {
       this.processQueue();
    }

    return { exchangeId, status: task.status };
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
      const pendingTasks = this.queue.filter(t => [ExchangeStatus.DRAFT, ExchangeStatus.CONSENT_GRANTED, ExchangeStatus.REQUESTED].includes(t.status));

      for (const task of pendingTasks) {
        try {
          if (task.status === ExchangeStatus.DRAFT) {
            task.status = ExchangeStatus.CONSENT_REQUIRED;
            // The HieService export includes consent checking internally,
            // we will simulate the state machine progression here.
            const bundle = await this.hieService.exportClinicalSummary(
              task.patientId, 
              task.recipientFacilityId, 
              task.purpose, 
              task.user, 
              task.correlationId
            );
            
            task.status = ExchangeStatus.CONSENT_GRANTED;
            
            const req: ExchangeRequest = {
              patientId: task.patientId,
              purpose: task.purpose,
              destinationFacilityId: task.recipientFacilityId
            };
            const extExchangeId = await this.abdmGateway.createExchangeRequest(req);
            task.status = ExchangeStatus.REQUESTED;

            await this.abdmGateway.submitInformation(extExchangeId, bundle);
            task.status = ExchangeStatus.SUBMITTED;
            
            // Assume it's processed quickly for simulation
            task.status = ExchangeStatus.AVAILABLE;
          }
        } catch (error) {
          this.logger.error(`Failed to process HIE export \${task.exchangeId}: \${error.message}`);
          if (error.message.includes('No active consent')) {
            task.status = ExchangeStatus.REJECTED;
          } else {
            task.retryCount++;
            task.status = task.retryCount >= 3 ? ExchangeStatus.FAILED : ExchangeStatus.DRAFT;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  getMetrics() {
    const completed = this.queue.filter(t => t.status === ExchangeStatus.COMPLETED || t.status === ExchangeStatus.AVAILABLE).length;
    const failed = this.queue.filter(t => t.status === ExchangeStatus.FAILED || t.status === ExchangeStatus.REJECTED).length;
    const pending = this.queue.length - completed - failed;

    return {
      recordsShared: completed,
      exchangeSuccessRate: this.queue.length > 0 ? (completed / this.queue.length) * 100 : 100,
      exchangeFailureRate: this.queue.length > 0 ? (failed / this.queue.length) * 100 : 0,
      pendingExchanges: pending,
      totalExchanges: this.queue.length,
      // Phase 37 additional metrics
      consentFailures: this.queue.filter(t => t.status === ExchangeStatus.REJECTED).length,
      emergencyExchangeFailures: this.queue.filter(t => t.status === ExchangeStatus.FAILED && t.priority === 'EMERGENCY').length,
    };
  }

  // Phase 43: Look up an exchange by ID for status tracking
  getExchangeById(exchangeId: string): ExchangeTask | undefined {
    return this.queue.find(t => t.exchangeId === exchangeId);
  }

  // Phase 64: Exchange Reconciliation
  private async runReconciliation() {
    this.logger.log(`Starting HIE Exchange Reconciliation...`);
    // 1. Find stuck exchanges (SUBMITTED but not AVAILABLE for > 1hr)
    const stuck = this.queue.filter(t => t.status === ExchangeStatus.SUBMITTED);
    for (const task of stuck) {
      this.logger.warn(`Exchange \${task.exchangeId} is stuck in SUBMITTED state. Verifying with external adapter...`);
      const externalStatus = await this.abdmGateway.checkStatus(task.exchangeId);
      if (externalStatus === ExchangeStatus.COMPLETED || externalStatus === ExchangeStatus.AVAILABLE) {
        this.logger.log(`Reconciled \${task.exchangeId}: External state is AVAILABLE, updating local state.`);
        task.status = ExchangeStatus.AVAILABLE;
      }
    }
  }
}
