import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiagnosticOrder } from './entities/diagnostic.entity.js';

export interface DiagnosticCapability {
  code: string;
  name: string;
  availableToday: boolean;
  nextSlotDate?: string;
  queueLength: number;
}

@Injectable()
export class DiagnosticsService {
  private readonly logger = new Logger(DiagnosticsService.name);

  constructor(
    @InjectRepository(DiagnosticOrder)
    private readonly repo: Repository<DiagnosticOrder>,
  ) {}

  async getCapabilities(facilityId: string): Promise<DiagnosticCapability[]> {
    return [
      { code: '1234-5', name: 'General Lab Test', availableToday: true, queueLength: 0 }
    ];
  }

  async getOrders(patientId?: string) {
    const where: any = {};
    if (patientId) where.patientId = patientId;
    return this.repo.find({ where, order: { orderedAt: 'DESC' } });
  }

  async orderTest(patientId: string, testCode: string, testName: string, orderingProviderId: string = 'MO-1', destinationFacilityId: string = 'PHC-001') {
    this.logger.log(`Ordering lab test ${testName} for patient ${patientId} to ${destinationFacilityId}`);
    
    const order = this.repo.create({
      patientId,
      patientName: 'Unknown Patient',
      testCode,
      testName,
      status: 'PENDING'
    });
    
    return this.repo.save(order);
  }

  async submitResult(orderId: string, resultValue: number, resultUnit: string, testName: string) {
    this.logger.log(`Submitting result for Order ${orderId}`);
    
    const order = await this.repo.findOneBy({ id: orderId });
    if (!order) throw new Error('Order not found');

    order.status = 'COMPLETED';
    order.resultValue = resultValue;
    order.resultUnit = resultUnit;
    
    return this.repo.save(order);
  }
}
