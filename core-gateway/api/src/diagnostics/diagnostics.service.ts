import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { DiagnosticOrder } from './entities/diagnostic.entity.js';

@Injectable()
export class DiagnosticsService {
  private readonly logger = new Logger(DiagnosticsService.name);
  private readonly hapiUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(DiagnosticOrder)
    private readonly diagnosticRepository: Repository<DiagnosticOrder>,
  ) {}

  async getOrders() {
    return this.diagnosticRepository.find({ order: { orderedAt: 'DESC' } });
  }

  async orderTest(patientId: string, patientName: string, testCode: string, testName: string, orderingProviderId: string = 'MO-1') {
    this.logger.log(`Ordering lab test ${testName} for patient ${patientId}`);
    
    // Save to DB
    const order = this.diagnosticRepository.create({
      patientId,
      patientName,
      testCode,
      testName,
      status: 'PENDING',
    });
    const savedOrder = await this.diagnosticRepository.save(order);

    // Create FHIR ServiceRequest
    const serviceRequest = {
      resourceType: 'ServiceRequest',
      id: savedOrder.id,
      status: 'active',
      intent: 'order',
      subject: { reference: `Patient/${patientId}`, display: patientName },
      requester: { reference: `Practitioner/${orderingProviderId}` },
      code: {
        coding: [{ system: 'http://loinc.org', code: testCode, display: testName }]
      },
      authoredOn: new Date().toISOString(),
    };

    try {
      await lastValueFrom(
        this.httpService.put(`${this.hapiUrl}/ServiceRequest/${serviceRequest.id}`, serviceRequest, {
          headers: { 'Content-Type': 'application/fhir+json' }
        })
      );
    } catch (error: any) {
      this.logger.warn(`Failed to push ServiceRequest to HAPI. Error: ${error.message}`);
    }
    
    return savedOrder;
  }

  async submitResult(orderId: string, resultValue: number, resultUnit: string) {
    this.logger.log(`Submitting result for Order ${orderId}`);
    
    const order = await this.diagnosticRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    order.status = 'COMPLETED';
    order.resultValue = resultValue;
    order.resultUnit = resultUnit;
    const savedOrder = await this.diagnosticRepository.save(order);

    // Create FHIR DiagnosticReport
    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: uuidv4(),
      status: 'final',
      subject: { reference: `Patient/${order.patientId}`, display: order.patientName },
      basedOn: [{ reference: `ServiceRequest/${order.id}` }],
      result: [
        {
          reference: `#obs-1` // Inline contained observation for simplicity
        }
      ],
      contained: [
        {
          resourceType: 'Observation',
          id: 'obs-1',
          status: 'final',
          code: { text: order.testName },
          valueQuantity: { value: resultValue, unit: resultUnit }
        }
      ],
      issued: new Date().toISOString(),
    };

    try {
      await lastValueFrom(
        this.httpService.put(`${this.hapiUrl}/DiagnosticReport/${diagnosticReport.id}`, diagnosticReport, {
          headers: { 'Content-Type': 'application/fhir+json' }
        })
      );
    } catch (error: any) {
      this.logger.warn(`Failed to push DiagnosticReport to HAPI. Error: ${error.message}`);
    }

    return savedOrder;
  }
}
